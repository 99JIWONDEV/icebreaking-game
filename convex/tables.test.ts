/// <reference types="vite/client" />
// convex-test는 실제 Convex 백엔드가 아니라 메모리 mock이다 — 직렬화 가능 트랜잭션의
// 진짜 동시성/OCC 재시도 동작은 여기서 검증되지 않는다 (spec Part B §2, §5-1). 진짜 동시성은
// scripts/concurrency.ts로 실제 dev deployment에 대고 확인한다.
// 확인 필요: Convex의 공식 testing guideline은 vitest environment를 "edge-runtime"으로
// 맞추라고 권하지만(@edge-runtime/vm 필요), 이 프로젝트는 "node" 환경에서 12개 전부
// 통과해서 그대로 뒀다 — 실제 엣지 런타임과의 미묘한 차이가 있을 수 있다.
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { describe, expect, it } from "vitest";
import schema from "./schema";
// src/lib/questions.ts는 Next.js의 "@/" 경로 별칭을 쓰므로 convex/tsconfig.json(별칭 미설정)
// 아래에서는 타입체크가 안 된다. convex/lib/cards.ts와 같은 방식으로 JSON을 상대 경로로 바로 읽는다.
import data from "../src/data/questions.json";

type Question = { id: string; category: string; ko: string; en: string };
const questions: Question[] = data.questions;

// convex-test는 _generated 폴더 존재 여부를 modules glob으로 직접 확인한다 — tables.ts/admin.ts만
// 넣으면 실제 codegen이 끝났어도 "_generated를 못 찾았다"고 거절한다. 전체(함수+생성 코드)를 넣는다.
const modules = import.meta.glob(["./**/*.{ts,js}", "!./**/*.test.ts"]);

function t() {
  return convexTest(schema, modules);
}

const CARD_A = questions[0].id;
const CARD_B = questions[1].id;
const CATEGORY = questions[0].category;

describe("tables.seed", () => {
  it("멱등 — 두 번 호출해도 테이블이 중복 생기지 않는다", async () => {
    const test = t();
    const first = await test.mutation(anyApi.tables.seed, {});
    const second = await test.mutation(anyApi.tables.seed, {});
    expect(first.created).toBe(20); // DEFAULT_CONFIG.tableCount
    expect(second.created).toBe(0);
    const doc = await test.query(anyApi.tables.get, { number: 1 });
    expect(doc.exists).toBe(true);
  });
});

describe("tables.drawCard", () => {
  it("성공하면 opened, current가 채워진다", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    const result = await test.mutation(anyApi.tables.drawCard, {
      table: 1,
      cardId: CARD_A,
      epoch: 0,
      clientId: "client-1",
    });
    expect(result.status).toBe("opened");
    expect(result.state.current?.cardId).toBe(CARD_A);
  });

  it("이미 열려 있으면 busy", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    await test.mutation(anyApi.tables.drawCard, { table: 1, cardId: CARD_A, epoch: 0, clientId: "client-1" });
    const result = await test.mutation(anyApi.tables.drawCard, {
      table: 1,
      cardId: CARD_B,
      epoch: 0,
      clientId: "client-2",
    });
    expect(result.status).toBe("busy");
  });

  it("같은 clientId가 같은 카드를 다시 요청하면 멱등하게 opened", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    const first = await test.mutation(anyApi.tables.drawCard, { table: 1, cardId: CARD_A, epoch: 0, clientId: "client-1" });
    const second = await test.mutation(anyApi.tables.drawCard, { table: 1, cardId: CARD_A, epoch: 0, clientId: "client-1" });
    expect(second.status).toBe("opened");
    expect(second.state.current?.openedAt).toBe(first.state.current?.openedAt);
  });

  it("epoch이 다르면 reset", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    const result = await test.mutation(anyApi.tables.drawCard, { table: 1, cardId: CARD_A, epoch: 99, clientId: "client-1" });
    expect(result.status).toBe("reset");
  });

  it("범위 밖 테이블/모르는 cardId는 invalid", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    const badTable = await test.mutation(anyApi.tables.drawCard, { table: 999, cardId: CARD_A, epoch: 0, clientId: "client-1" });
    expect(badTable.status).toBe("invalid");
    const badCard = await test.mutation(anyApi.tables.drawCard, { table: 1, cardId: "no-such", epoch: 0, clientId: "client-1" });
    expect(badCard.status).toBe("invalid");
  });

  it("이미 사용된 카드는 already_used", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    // minOpenMs(2초)를 실제로 기다리지 않도록 run()으로 "이미 닫혀서 used에 들어간" 상태를 직접 만든다.
    await test.run(async (ctx) => {
      const doc = await ctx.db
        .query("tables")
        .withIndex("by_number", (q) => q.eq("number", 1))
        .unique();
      if (!doc) throw new Error("missing table");
      await ctx.db.patch(doc._id, { used: [CARD_A] });
    });
    const result = await test.mutation(anyApi.tables.drawCard, { table: 1, cardId: CARD_A, epoch: 0, clientId: "client-2" });
    expect(result.status).toBe("already_used");
  });
});

describe("tables.closeCard", () => {
  it("minOpenMs 전에는 too_soon", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    await test.mutation(anyApi.tables.drawCard, { table: 1, cardId: CARD_A, epoch: 0, clientId: "client-1" });
    const result = await test.mutation(anyApi.tables.closeCard, { table: 1, cardId: CARD_A, epoch: 0, clientId: "client-1" });
    expect(result.status).toBe("too_soon");
  });

  it("cardId가 다르면 noop (늦은 덮기)", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    await test.mutation(anyApi.tables.drawCard, { table: 1, cardId: CARD_A, epoch: 0, clientId: "client-1" });
    const result = await test.mutation(anyApi.tables.closeCard, { table: 1, cardId: CARD_B, epoch: 0, clientId: "client-1" });
    expect(result.status).toBe("noop");
  });
});

describe("tables.drawRandom", () => {
  it("범위 안에 카드가 없으면 exhausted", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    const categoryIds = questions.filter((q) => q.category === CATEGORY).map((q) => q.id);
    // 이 카테고리를 전부 소진시킨다 — drawCard는 바로 호출하고, closeCard는 run()으로 시간을 건너뛴다.
    for (const id of categoryIds) {
      await test.run(async (ctx) => {
        const doc = await ctx.db
          .query("tables")
          .withIndex("by_number", (q) => q.eq("number", 1))
          .unique();
        if (!doc) throw new Error("missing table");
        await ctx.db.patch(doc._id, { used: [...doc.used, id] });
      });
    }
    const result = await test.mutation(anyApi.tables.drawRandom, { table: 1, category: CATEGORY, epoch: 0, clientId: "client-1" });
    expect(result.status).toBe("exhausted");
  });
});

describe("tables.reshuffleCategory", () => {
  it("전부 사용되기 전에는 not_exhausted", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    const result = await test.mutation(anyApi.tables.reshuffleCategory, { table: 1, category: CATEGORY, epoch: 0 });
    expect(result.status).toBe("not_exhausted");
  });
});

describe("admin — 비밀번호 미설정", () => {
  it("ADMIN_PASSCODE가 없으면 not_configured", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    const result = await test.mutation(anyApi.admin.resetTable, { table: 1, passcode: "whatever" });
    expect(result.status).toBe("not_configured");
  });
});

// spec §9 "초기화 경합" — 실제 admin.resetTable은 ADMIN_PASSCODE가 있어야 호출되는데, 그 값은
// 읽거나 출력하거나 파일에 쓰지 않기로 했다. 그래서 관리자 인증 레이어는 건너뛰고, resetTable이
// 하는 일(epoch+1, current/used 초기화)을 db에 직접 적용해 "초기화 직전에 보낸 요청" 상황만 재현한다.
describe("초기화 경합 (spec §9)", () => {
  it("초기화 직전에 보낸 요청은 reset, 상태는 초기 상태", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    const staleEpoch = (
      await test.run(async (ctx) => {
        const doc = await ctx.db.query("tables").withIndex("by_number", (q) => q.eq("number", 1)).unique();
        if (!doc) throw new Error("missing table");
        return doc.epoch;
      })
    );
    // 관리자가 초기화 — resetTable과 동일한 효과(epoch+1, current=null, used=[])를 db에 직접 적용.
    await test.run(async (ctx) => {
      const doc = await ctx.db.query("tables").withIndex("by_number", (q) => q.eq("number", 1)).unique();
      if (!doc) throw new Error("missing table");
      await ctx.db.patch(doc._id, { epoch: doc.epoch + 1, current: null, used: [], updatedAt: Date.now() });
    });
    const result = await test.mutation(anyApi.tables.drawCard, {
      table: 1,
      cardId: CARD_A,
      epoch: staleEpoch, // 초기화 이전 epoch로 보낸, "경합 중" 요청
      clientId: "client-1",
    });
    expect(result.status).toBe("reset");
    expect(result.state?.current).toBeNull();
    expect(result.state?.used).toEqual([]);
  });
});

// spec §9 "방치" — staleAfterMs(기본 10분)를 실제로 기다릴 수 없으니, config 문서를 직접 넣어
// 테스트에서만 짧게 줄인다(관리자 함수로 노출된 설정은 아니다 — tables.ts의 getConfig가 config
// 컬렉션에 문서가 있으면 그 값을, 없으면 DEFAULT_CONFIG를 쓰는 걸 그대로 이용).
describe("방치 (spec §9)", () => {
  it("staleAfterMs 지난 카드는 새 draw 시 자동으로 used 처리되고 새 카드가 열린다", async () => {
    const test = t();
    await test.mutation(anyApi.tables.seed, {});
    await test.run(async (ctx) => {
      await ctx.db.insert("config", { tableCount: 20, minOpenMs: 2000, staleAfterMs: 50 });
    });
    await test.mutation(anyApi.tables.drawCard, { table: 1, cardId: CARD_A, epoch: 0, clientId: "client-1" });
    await new Promise((r) => setTimeout(r, 80)); // staleAfterMs(50ms) 경과
    const result = await test.mutation(anyApi.tables.drawCard, { table: 1, cardId: CARD_B, epoch: 0, clientId: "client-2" });
    expect(result.status).toBe("opened");
    expect(result.state?.current?.cardId).toBe(CARD_B);
    expect(result.state?.used).toContain(CARD_A);
  });
});
