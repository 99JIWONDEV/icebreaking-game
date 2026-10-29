import { describe, expect, it, vi } from "vitest";
import { LocalMockRepository } from "@/lib/table/LocalMockRepository";
import type { KeyValueStorage } from "@/lib/table/storage";
import { questions } from "@/lib/questions";

function sharedStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

function repo(storage: KeyValueStorage, now: () => number, channelName = `t-${Math.random()}`) {
  return new LocalMockRepository({ storage, now, channelName });
}

const CARD_A = questions[0].id;
const CARD_B = questions[1].id;
const CARD_C = questions[2].id;

describe("동시 열기 (spec §9, §4-1)", () => {
  it("서로 다른 카드로 동시에 20개 요청하면 정확히 1개만 opened, 나머지는 busy", async () => {
    const storage = sharedStorage();
    const t = 1000;
    const r = repo(storage, () => t);
    const cardIds = questions.slice(0, 20).map((q) => q.id);

    const results = await Promise.all(
      cardIds.map((cardId) => r.drawCard({ table: 1, cardId, epoch: 0, clientId: `client-${cardId}` })),
    );

    const opened = results.filter((res) => res.status === "opened");
    const busy = results.filter((res) => res.status === "busy");
    expect(opened).toHaveLength(1);
    expect(busy).toHaveLength(19);
  });
});

describe("더블 탭 (spec §4-3)", () => {
  it("같은 clientId가 같은 카드를 연속 요청하면 둘 다 opened, 상태는 1회분", async () => {
    const storage = sharedStorage();
    const t = 1000;
    const r = repo(storage, () => t);

    const first = await r.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });
    const second = await r.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });

    expect(first.status).toBe("opened");
    expect(second.status).toBe("opened");
    expect(second.state!.current?.cardId).toBe(CARD_A);
    expect(second.state!.current?.openedAt).toBe(first.state!.current?.openedAt);
  });

  it("다른 clientId가 같은 카드를 요청하면 busy", async () => {
    const storage = sharedStorage();
    const t = 1000;
    const r = repo(storage, () => t);
    await r.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });
    const other = await r.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-2" });
    expect(other.status).toBe("busy");
  });
});

describe("늦은 덮기 (spec §4-6)", () => {
  it("A를 덮으려던 지연 요청이 B가 열린 뒤 도착하면 noop, B는 유지", async () => {
    const storage = sharedStorage();
    let t = 1000;
    const r = repo(storage, () => t);

    await r.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });
    t += 3000; // minOpenMs 경과
    const closedA = await r.closeCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });
    expect(closedA.status).toBe("closed");

    await r.drawCard({ table: 1, cardId: CARD_B, epoch: 0, clientId: "device-2" });

    // 지연되어 늦게 도착한 "A 덮기" 재전송
    const lateClose = await r.closeCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });
    expect(lateClose.status).toBe("noop");
    expect(lateClose.state!.current?.cardId).toBe(CARD_B);
  });
});

describe("초기화 경합 (spec §4-9, §9)", () => {
  it("열기 요청 직전에 reset되면 요청은 reset, 상태는 초기 상태", async () => {
    const storage = sharedStorage();
    const t = 1000;
    const r = repo(storage, () => t);

    await r.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });
    r.devResetTable(1);

    const result = await r.drawCard({ table: 1, cardId: CARD_B, epoch: 0, clientId: "device-2" });
    expect(result.status).toBe("reset");
    expect(result.state!.epoch).toBe(1);
    expect(result.state!.current).toBeNull();
    expect(result.state!.used).toEqual([]);
  });
});

describe("방치 (spec §4-8)", () => {
  it("staleAfterMs 경과 후 새 draw를 하면 이전 카드가 used 처리되고 새 카드가 열림", async () => {
    const storage = sharedStorage();
    let t = 1000;
    const r = repo(storage, () => t);

    await r.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });
    t += 11 * 60 * 1000; // staleAfterMs(10분) 초과

    const result = await r.drawCard({ table: 1, cardId: CARD_B, epoch: 0, clientId: "device-2" });
    expect(result.status).toBe("opened");
    expect(result.state!.current?.cardId).toBe(CARD_B);
    expect(result.state!.used).toContain(CARD_A);
  });
});

describe("열자마자 실수로 덮기 (spec §4-7)", () => {
  it("minOpenMs 전에는 too_soon", async () => {
    const storage = sharedStorage();
    let t = 1000;
    const r = repo(storage, () => t);
    await r.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });
    t += 500;
    const result = await r.closeCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });
    expect(result.status).toBe("too_soon");
  });
});

describe("덮기가 동시에 두 번 (spec §4-5)", () => {
  it("첫 번째만 closed, 두 번째는 noop", async () => {
    const storage = sharedStorage();
    let t = 1000;
    const r = repo(storage, () => t);
    await r.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });
    t += 3000;
    const [first, second] = await Promise.all([
      r.closeCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" }),
      r.closeCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-2" }),
    ]);
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual(["closed", "noop"]);
  });
});

describe("유효하지 않은 카드/이미 사용된 카드 (spec §4-15)", () => {
  it("존재하지 않는 cardId는 invalid", async () => {
    const storage = sharedStorage();
    const r = repo(storage, () => 1000);
    const result = await r.drawCard({ table: 1, cardId: "no-such-card", epoch: 0, clientId: "device-1" });
    expect(result.status).toBe("invalid");
  });

  it("이미 사용된 카드는 already_used", async () => {
    const storage = sharedStorage();
    let t = 1000;
    const r = repo(storage, () => t);
    await r.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });
    t += 3000;
    await r.closeCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });
    const result = await r.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-2" });
    expect(result.status).toBe("already_used");
  });
});

describe("카테고리 소진과 다시 섞기 (spec §4-14, §5-4)", () => {
  it("drawRandom은 범위 내 카드가 없으면 exhausted, 전부 사용 전에는 reshuffle이 not_exhausted", async () => {
    const storage = sharedStorage();
    let t = 1000;
    const r = repo(storage, () => t);
    const category = questions[0].category;
    const ids = questions.filter((q) => q.category === category).map((q) => q.id);

    const notExhausted = await r.reshuffleCategory({ table: 1, category, epoch: 0 });
    expect(notExhausted.status).toBe("not_exhausted");

    for (const cardId of ids) {
      await r.drawCard({ table: 1, cardId, epoch: 0, clientId: "device-1" });
      t += 3000;
      await r.closeCard({ table: 1, cardId, epoch: 0, clientId: "device-1" });
    }

    const exhausted = await r.drawRandom({ table: 1, category, epoch: 0, clientId: "device-1" });
    expect(exhausted.status).toBe("exhausted");

    const reshuffled = await r.reshuffleCategory({ table: 1, category, epoch: 0 });
    expect(reshuffled.status).toBe("reshuffled");
    expect(reshuffled.state!.used.filter((id) => ids.includes(id))).toHaveLength(0);
  });
});

describe("재접속 (spec §4-10)", () => {
  it("새 레포지토리 인스턴스로 다시 구독해도 저장된 마지막 상태를 그대로 받는다", async () => {
    const storage = sharedStorage();
    const t = 1000;
    const r1 = repo(storage, () => t);
    await r1.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" });

    const r2 = repo(storage, () => t); // "새로고침"을 새 인스턴스로 흉내
    const received: unknown[] = [];
    r2.subscribe(1, (s) => received.push(s), () => {});
    expect(received).toHaveLength(1);
    expect((received[0] as { current: { cardId: string } | null }).current?.cardId).toBe(CARD_A);
  });
});

describe("연결 끊김 시뮬레이션 (spec §4-11)", () => {
  it("forceOffline이면 요청이 reject되고, 해제하면 reconnecting을 거쳐 connected로 돌아온다", async () => {
    vi.useFakeTimers();
    const storage = sharedStorage();
    const r = repo(storage, () => 1000);
    const connStates: string[] = [];
    r.subscribe(1, () => {}, (c) => connStates.push(c));

    r.setDevOptions({ forceOffline: true });
    await expect(r.drawCard({ table: 1, cardId: CARD_A, epoch: 0, clientId: "device-1" })).rejects.toThrow();
    expect(connStates).toContain("offline");

    r.setDevOptions({ forceOffline: false });
    expect(connStates).toContain("reconnecting");
    await vi.advanceTimersByTimeAsync(600);
    expect(connStates[connStates.length - 1]).toBe("connected");
    vi.useRealTimers();
  });
});

describe("크로스 탭 동기화 (BroadcastChannel)", () => {
  it("한 탭에서 연 카드가 같은 채널의 다른 탭에도 전파된다", async () => {
    const storage = sharedStorage();
    const channelName = `cross-tab-${Math.random()}`;
    const tabA = repo(storage, () => 1000, channelName);
    const tabB = repo(storage, () => 1000, channelName);

    const seenByB: unknown[] = [];
    tabB.subscribe(1, (s) => seenByB.push(s), () => {});

    await tabA.drawCard({ table: 1, cardId: CARD_C, epoch: 0, clientId: "device-A" });
    await new Promise((resolve) => setTimeout(resolve, 10)); // BroadcastChannel is async

    const last = seenByB[seenByB.length - 1] as { current: { cardId: string } | null };
    expect(last.current?.cardId).toBe(CARD_C);
  });
});
