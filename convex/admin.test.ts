/// <reference types="vite/client" />
// 16: 관리자 초기화 기능 테스트. convex-test는 실제 Convex 백엔드가 아니라 메모리 mock이다 —
// 실제 OCC 재시도/동시성, 스케줄러 지연, 환경변수 주입, 크립토 구현 차이는 여기서 검증되지 않는다.
// 아래 비밀번호는 테스트 코드 안의 더미 값이며 실제 배포의 ADMIN_PASSCODE와 무관하다.
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import data from "../src/data/questions.json";

const modules = import.meta.glob(["./**/*.{ts,js}", "!./**/*.test.ts"]);
const t = () => convexTest(schema, modules);

const DUMMY_PASSCODE = "dummy-test-passcode-0001";
const WRONG = "not-the-passcode";
const CARDS = data.questions.map((q) => q.id);

type Test = ReturnType<typeof t>;

async function seedWithUsage(test: Test) {
  await test.mutation(anyApi.tables.seed, {});
  // table 1: 열린 카드 3장(used 2 + current 1), table 2: used 1장, 나머지는 빈 상태
  await test.run(async (ctx) => {
    const one = await ctx.db.query("tables").withIndex("by_number", (q) => q.eq("number", 1)).unique();
    const two = await ctx.db.query("tables").withIndex("by_number", (q) => q.eq("number", 2)).unique();
    if (!one || !two) throw new Error("seed missing");
    await ctx.db.patch(one._id, {
      used: [CARDS[0], CARDS[1]],
      current: { cardId: CARDS[2], openedAt: 1, kind: "pick", by: "client-1" },
    });
    await ctx.db.patch(two._id, { used: [CARDS[3]] });
  });
}

async function tableDoc(test: Test, n: number) {
  return test.run(async (ctx) => ctx.db.query("tables").withIndex("by_number", (q) => q.eq("number", n)).unique());
}

async function login(test: Test): Promise<string> {
  const res = await test.mutation(anyApi.admin.checkPasscode, { passcode: DUMMY_PASSCODE });
  if (res.status !== "ok" || !res.token) throw new Error(`login failed: ${res.status}`);
  return res.token;
}

beforeEach(() => {
  vi.stubEnv("ADMIN_PASSCODE", DUMMY_PASSCODE);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("admin — 비밀번호 설정/검증", () => {
  it("ADMIN_PASSCODE 미설정이면 모든 admin 함수가 not_configured (빈 값으로 통과 안 됨)", async () => {
    vi.stubEnv("ADMIN_PASSCODE", "");
    const test = t();
    await seedWithUsage(test);
    for (const passcode of ["", "anything"]) {
      expect((await test.mutation(anyApi.admin.checkPasscode, { passcode })).status).toBe("not_configured");
      expect((await test.mutation(anyApi.admin.resetTable, { passcode, tableNo: 1 })).status).toBe("not_configured");
      expect((await test.mutation(anyApi.admin.resetAllTables, { passcode })).status).toBe("not_configured");
    }
    expect((await tableDoc(test, 1))?.used).toHaveLength(2); // 아무것도 안 지워졌다
  });

  it("ADMIN_PASSCODE가 8자 미만이면 올바른 값을 보내도 not_configured", async () => {
    vi.stubEnv("ADMIN_PASSCODE", "short7!"); // 7자
    const test = t();
    await seedWithUsage(test);
    expect((await test.mutation(anyApi.admin.checkPasscode, { passcode: "short7!" })).status).toBe("not_configured");
    expect((await test.mutation(anyApi.admin.resetTable, { passcode: "short7!", tableNo: 1 })).status).toBe("not_configured");
  });

  it("틀린 passcode는 denied이고 아무것도 바뀌지 않는다", async () => {
    const test = t();
    await seedWithUsage(test);
    expect((await test.mutation(anyApi.admin.resetTable, { passcode: WRONG, tableNo: 1 })).status).toBe("denied");
    expect((await test.mutation(anyApi.admin.resetAllTables, { passcode: WRONG })).status).toBe("denied");
    const one = await tableDoc(test, 1);
    expect(one?.epoch).toBe(0);
    expect(one?.used).toHaveLength(2);
  });

  it("연속 5회 실패하면 10분 잠금 — 올바른 비밀번호도 거부하고 남은 시간을 알려준다, 10분 뒤 해제", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T00:00:00Z"));
    const test = t();
    for (let i = 0; i < 5; i++) {
      expect((await test.mutation(anyApi.admin.checkPasscode, { passcode: WRONG })).status).toBe("denied");
    }
    const locked = await test.mutation(anyApi.admin.checkPasscode, { passcode: DUMMY_PASSCODE });
    expect(locked.status).toBe("locked");
    expect(locked.retryAfterMs).toBeGreaterThan(9 * 60_000);
    expect(locked.retryAfterMs).toBeLessThanOrEqual(10 * 60_000);

    vi.setSystemTime(new Date("2026-11-20T00:09:59Z"));
    expect((await test.mutation(anyApi.admin.checkPasscode, { passcode: DUMMY_PASSCODE })).status).toBe("locked");

    vi.setSystemTime(new Date("2026-11-20T00:10:01Z"));
    expect((await test.mutation(anyApi.admin.checkPasscode, { passcode: DUMMY_PASSCODE })).status).toBe("ok");
  });

  it("잠금이 풀린 뒤에는 실패 횟수를 0부터 다시 센다(한 번 틀렸다고 바로 재잠금되지 않는다)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T00:00:00Z"));
    const test = t();
    for (let i = 0; i < 5; i++) await test.mutation(anyApi.admin.checkPasscode, { passcode: WRONG });
    vi.setSystemTime(new Date("2026-11-20T00:10:01Z"));
    expect((await test.mutation(anyApi.admin.checkPasscode, { passcode: WRONG })).status).toBe("denied");
    expect((await test.mutation(anyApi.admin.checkPasscode, { passcode: DUMMY_PASSCODE })).status).toBe("ok");
  });

  it("성공하면 실패 횟수가 초기화된다(4번 실패 후 성공 → 다시 4번 틀려도 안 잠긴다)", async () => {
    const test = t();
    for (let i = 0; i < 4; i++) await test.mutation(anyApi.admin.checkPasscode, { passcode: WRONG });
    expect((await test.mutation(anyApi.admin.checkPasscode, { passcode: DUMMY_PASSCODE })).status).toBe("ok");
    for (let i = 0; i < 4; i++) {
      expect((await test.mutation(anyApi.admin.checkPasscode, { passcode: WRONG })).status).toBe("denied");
    }
    expect((await test.mutation(anyApi.admin.checkPasscode, { passcode: DUMMY_PASSCODE })).status).toBe("ok");
  });
});

describe("admin.resetTable — 단일 테이블", () => {
  it("대상 테이블만 비우고 epoch+1, 다른 테이블은 건드리지 않는다", async () => {
    const test = t();
    await seedWithUsage(test);
    const before2 = await tableDoc(test, 2);
    const res = await test.mutation(anyApi.admin.resetTable, { passcode: DUMMY_PASSCODE, tableNo: 1 });
    expect(res).toMatchObject({ status: "ok", openedBefore: 3 });

    const one = await tableDoc(test, 1);
    expect(one).toMatchObject({ epoch: 1, current: null, used: [] });
    const two = await tableDoc(test, 2);
    expect(two).toEqual(before2); // 통째로 동일(updatedAt·epoch 포함)
    const three = await tableDoc(test, 3);
    expect(three?.epoch).toBe(0);
  });

  it("범위 밖 테이블 번호는 invalid", async () => {
    const test = t();
    await seedWithUsage(test);
    expect((await test.mutation(anyApi.admin.resetTable, { passcode: DUMMY_PASSCODE, tableNo: 999 })).status).toBe("invalid");
  });

  it("초기화 전 epoch로 보낸 동기화 요청은 기존 규칙대로 reset을 받는다(CAS/epoch 규칙 그대로)", async () => {
    const test = t();
    await seedWithUsage(test);
    await test.mutation(anyApi.admin.resetTable, { passcode: DUMMY_PASSCODE, tableNo: 1 });
    const stale = await test.mutation(anyApi.tables.drawCard, { table: 1, cardId: CARDS[5], epoch: 0, clientId: "client-1" });
    expect(stale.status).toBe("reset");
    expect(stale.state).toMatchObject({ epoch: 1, current: null, used: [] });
    const fresh = await test.mutation(anyApi.tables.drawCard, { table: 1, cardId: CARDS[5], epoch: 1, clientId: "client-1" });
    expect(fresh.status).toBe("opened");
  });
});

describe("admin.resetAllTables — 전체", () => {
  it("모든 테이블을 비우고 epoch+1, 로그에 총 열린 카드 수가 남는다", async () => {
    const test = t();
    await seedWithUsage(test);
    const res = await test.mutation(anyApi.admin.resetAllTables, { passcode: DUMMY_PASSCODE });
    expect(res).toMatchObject({ status: "ok", done: true, tablesReset: 20, openedBefore: 4 });
    for (let n = 1; n <= 20; n++) {
      expect(await tableDoc(test, n)).toMatchObject({ epoch: 1, current: null, used: [] });
    }
    const logs = await test.run(async (ctx) => ctx.db.query("adminLog").collect());
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ action: "reset_all", openedBefore: 4, tablesReset: 20, via: "admin" });
  });
});

describe("배치 처리 (한도보다 문서가 많다고 가정)", () => {
  it("batchSize보다 많으면 scheduler로 이어 가고, 각 테이블 epoch는 정확히 +1, 로그는 1건", async () => {
    vi.useFakeTimers();
    const test = t();
    await seedWithUsage(test);
    const first = await test.mutation(internal.resets.resetAllTables, { batchSize: 3 });
    expect(first.done).toBe(false); // 20개 중 3개만 처리하고 이어 가기로 했다
    await test.finishAllScheduledFunctions(vi.runAllTimers);

    for (let n = 1; n <= 20; n++) {
      expect(await tableDoc(test, n)).toMatchObject({ epoch: 1, current: null, used: [] });
    }
    const logs = await test.run(async (ctx) => ctx.db.query("adminLog").collect());
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ action: "reset_all", openedBefore: 4, tablesReset: 20, via: "cli" });
  });

  it("같은 runId로 다시 실행하면(중간에 멈췄다 재개) 이미 처리한 테이블의 epoch가 또 오르지 않는다", async () => {
    vi.useFakeTimers();
    const test = t();
    await seedWithUsage(test);
    const runId = 12345;
    // 첫 배치(1~3번)까지만 처리된 뒤 멈춘 상황
    await test.mutation(internal.resets.resetAllTables, { runId, batchSize: 3 });
    // 같은 runId로 처음부터 재실행
    await test.mutation(internal.resets.resetAllTables, { runId, batchSize: 3 });
    await test.finishAllScheduledFunctions(vi.runAllTimers);
    for (let n = 1; n <= 20; n++) expect((await tableDoc(test, n))?.epoch).toBe(1);
  });
});

describe("내부 함수 (비밀번호 없이 CLI/서버에서만)", () => {
  it("resets.resetTable은 한 테이블만 초기화하고 via=cli로 기록", async () => {
    const test = t();
    await seedWithUsage(test);
    expect(await test.mutation(internal.resets.resetTable, { tableNo: 1 })).toMatchObject({ status: "ok", openedBefore: 3 });
    expect((await tableDoc(test, 2))?.epoch).toBe(0);
    const logs = await test.run(async (ctx) => ctx.db.query("adminLog").collect());
    expect(logs[0]).toMatchObject({ action: "reset_table", tableNo: 1, via: "cli" });
  });

  it("resets.preview(dry-run)는 아무것도 바꾸지 않는다", async () => {
    const test = t();
    await seedWithUsage(test);
    const all = await test.query(internal.resets.preview, {});
    expect(all).toMatchObject({ configuredTableCount: 20, tableDocs: 20, targetDocs: 20, openedCards: 4 });
    const one = await test.query(internal.resets.preview, { tableNo: 1 });
    expect(one).toMatchObject({ targetDocs: 1, openedCards: 3 });
    expect((await tableDoc(test, 1))?.epoch).toBe(0);
    expect(await test.run(async (ctx) => ctx.db.query("adminLog").collect())).toHaveLength(0);
  });
});

describe("listTables / recentLog (세션 토큰)", () => {
  it("토큰 없이/틀린 토큰으로는 denied", async () => {
    const test = t();
    await seedWithUsage(test);
    expect((await test.query(anyApi.admin.listTables, { token: "x".repeat(64) })).status).toBe("denied");
    expect((await test.query(anyApi.admin.listTables, { token: "" })).status).toBe("denied");
    expect((await test.query(anyApi.admin.recentLog, { token: "x".repeat(64) })).status).toBe("denied");
  });

  it("로그인 후 1..N 전부와 열린 카드 수를 돌려주고, seed 안 된 테이블은 0장", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    await test.run(async (ctx) => {
      const last = await ctx.db.query("tables").withIndex("by_number", (q) => q.eq("number", 20)).unique();
      if (last) await ctx.db.delete(last._id); // 문서가 없는 테이블
      const one = await ctx.db.query("tables").withIndex("by_number", (q) => q.eq("number", 1)).unique();
      if (one) await ctx.db.patch(one._id, { used: [CARDS[0]], current: { cardId: CARDS[1], openedAt: 1, kind: "pick", by: "c1" } });
    });
    const token = await login(test);
    const res = await test.query(anyApi.admin.listTables, { token });
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.tables).toHaveLength(20);
    expect(res.total).toBe(CARDS.length);
    expect(res.tables[0]).toMatchObject({ tableNo: 1, openedCount: 2 });
    expect(res.tables[19]).toMatchObject({ tableNo: 20, openedCount: 0, updatedAt: null });
  });

  it("signOut 하면 같은 토큰이 바로 무효", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    const token = await login(test);
    await test.mutation(anyApi.admin.signOut, { token });
    expect((await test.query(anyApi.admin.listTables, { token })).status).toBe("denied");
  });

  it("세션은 4시간 뒤 scheduler가 지운다", async () => {
    vi.useFakeTimers();
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    const token = await login(test);
    await test.finishAllScheduledFunctions(vi.runAllTimers);
    expect((await test.query(anyApi.admin.listTables, { token })).status).toBe("denied");
  });

  it("recentLog는 최근 10건만, 최신순", async () => {
    const test = t();
    await seedWithUsage(test);
    for (let i = 0; i < 12; i++) await test.mutation(anyApi.admin.resetTable, { passcode: DUMMY_PASSCODE, tableNo: (i % 5) + 1 });
    const token = await login(test);
    const res = await test.query(anyApi.admin.recentLog, { token });
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.rows).toHaveLength(10);
    expect(res.rows[0].at).toBeGreaterThanOrEqual(res.rows[9].at);
  });
});

describe("passcode가 어디에도 남지 않는다", () => {
  it("감사 로그/실패 기록/세션 어디에도 passcode·원문 토큰이 없다", async () => {
    const test = t();
    await seedWithUsage(test);
    await test.mutation(anyApi.admin.checkPasscode, { passcode: WRONG });
    const token = await login(test);
    await test.mutation(anyApi.admin.resetTable, { passcode: DUMMY_PASSCODE, tableNo: 1 });
    await test.mutation(anyApi.admin.resetAllTables, { passcode: DUMMY_PASSCODE });
    const dump = await test.run(async (ctx) =>
      JSON.stringify({
        log: await ctx.db.query("adminLog").collect(),
        attempts: await ctx.db.query("adminAttempts").collect(),
        sessions: await ctx.db.query("adminSessions").collect(),
      }),
    );
    expect(dump).not.toContain(DUMMY_PASSCODE);
    expect(dump).not.toContain(WRONG);
    expect(dump).not.toContain(token); // 세션은 해시만 저장
  });

  it("거부 응답/에러에 passcode가 들어 있지 않다", async () => {
    const test = t();
    const res = await test.mutation(anyApi.admin.checkPasscode, { passcode: WRONG });
    expect(JSON.stringify(res)).not.toContain(WRONG);
  });
});
