// @vitest-environment jsdom
// 17: 사용된 카드를 눌러 질문을 다시 보는 "보기 전용" 모드 테스트. useTableState(서버 구독/mutation)는
// 목이다 — 이 기능은 로컬 상태만 써야 하므로 mutation spy가 한 번도 안 불렸음을 증명하는 게 핵심.
// 실제 서버/동기화 동작과 실기기 뒤집기 연출은 여기서 검증되지 않는다(Playwright 회귀 + 실기기 확인 필요).
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { questions } from "@/lib/questions";
import { LocalMockRepository } from "@/lib/table/LocalMockRepository";
import type { KeyValueStorage } from "@/lib/table/storage";

type TS = {
  number: number;
  epoch: number;
  current: null | { cardId: string; openedAt: number; kind: "pick" | "random"; by: string };
  used: string[];
  updatedAt: number;
};

const store = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const spies = {
    drawCard: vi.fn(),
    drawRandom: vi.fn(),
    closeCard: vi.fn(),
    reshuffleCategory: vi.fn(),
  };
  let snap: { state: unknown; connection: string } = { state: null, connection: "connected" };
  return {
    spies,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSnapshot: () => snap,
    set(next: Partial<typeof snap>) {
      snap = { ...snap, ...next };
      for (const l of listeners) l();
    },
  };
});

vi.mock("@/lib/table/useTableState", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useTableState: () => {
      const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
      return { state: snap.state, connection: snap.connection, clientId: "client-test-001", ...store.spies };
    },
  };
});
// jsdom에서는 motion의 exit 애니메이션이 끝나지 않는다 — 기존 공유 카드의 exit도 마찬가지라서(대조 실험으로
// 확인) 환경 한계다. 여기서는 AnimatePresence를 통과형으로 바꿔 "오버레이 슬롯은 하나" 로직과 mutation 0건만
// 검증하고, 실제 exit/mode="wait" 동작과 "동시에 두 개 없음"은 Playwright(진짜 브라우저)에서 검증한다.
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});
vi.mock("@/lib/table", () => ({
  hasServerRepository: () => false,
  setActiveMode: vi.fn(),
  useActiveMode: () => "local",
  useServerConnected: () => false,
}));

import { MainScreen } from "@/components/MainScreen";

const A = questions[0]; // 사용된 카드
const B = questions[5]; // 미사용 카드(다른 사람이 여는 카드)
const baseState = (over: Partial<TS> = {}): TS => ({ number: 7, epoch: 0, current: null, used: [A.id], updatedAt: 1, ...over });
const reviewDialogName = new RegExp(`카드 ${questions.indexOf(A) + 1}번 다시 보기`);

beforeEach(() => {
  // jsdom에 없는 브라우저 API — 최소한만 흉내낸다. reduced-motion을 켜서 애니메이션을 짧게(150ms) 만든다.
  window.matchMedia = ((q: string) => ({
    matches: q.includes("reduce"),
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
  for (const spy of Object.values(store.spies)) spy.mockReset().mockResolvedValue({ status: "opened" });
  store.set({ state: baseState(), connection: "connected" });
  localStorage.clear();
});
afterEach(() => cleanup());

const usedCard = () => screen.getByRole("button", { name: new RegExp(`${String(questions.indexOf(A) + 1).padStart(2, "0")}번 카드.*사용함`) });
const noMutationCalls = () => Object.values(store.spies).every((s) => s.mock.calls.length === 0);

function renderMain() {
  return render(<MainScreen tableNumber={7} onChangeTable={() => {}} />);
}

describe("사용된 카드 다시 보기 (보기 전용)", () => {
  it("사용된 카드는 활성 버튼이고 '눌러서 다시 보기' 안내가 접근성 이름에 있다", () => {
    renderMain();
    const btn = usedCard() as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute("aria-disabled")).toBe("false");
    expect(btn.getAttribute("aria-label")).toMatch(/눌러서 다시 보기/);
  });

  it("탭하면 오버레이가 열리고 질문이 보이며 mutation/repository 호출은 0건", async () => {
    const user = userEvent.setup();
    renderMain();
    await user.click(usedCard());
    const dialog = await screen.findByRole("dialog", { name: reviewDialogName });
    expect(within(dialog).getByText(A.ko)).toBeTruthy();
    expect(within(dialog).getByText("다시 보기 · Review")).toBeTruthy(); // 개인 보기 표시
    expect(noMutationCalls()).toBe(true);
  });

  it("닫기: mutation 0건, 사용 상태(used)는 그대로, 카드는 계속 '사용함'", async () => {
    const user = userEvent.setup();
    renderMain();
    await user.click(usedCard());
    const close = await screen.findByRole("button", { name: /카드 덮기/ });
    await waitFor(() => expect((close as HTMLButtonElement).disabled).toBe(false)); // minOpenMs 게이트 없음
    await user.click(close);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 3000 });
    expect(noMutationCalls()).toBe(true);
    expect((store.getSnapshot().state as TS).used).toEqual([A.id]);
    expect(usedCard()).toBeTruthy();
  });

  it("Escape로도 닫히고 mutation은 0건", async () => {
    const user = userEvent.setup();
    renderMain();
    await user.click(usedCard());
    await screen.findByRole("dialog", { name: reviewDialogName });
    await waitFor(() => expect((screen.getByRole("button", { name: /카드 덮기/ }) as HTMLButtonElement).disabled).toBe(false));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 3000 });
    expect(noMutationCalls()).toBe(true);
  });

  it("미사용 카드를 누르면 기존대로 drawCard를 부른다", async () => {
    const user = userEvent.setup();
    renderMain();
    const unused = screen.getByRole("button", { name: new RegExp(`${String(questions.indexOf(B) + 1).padStart(2, "0")}번 카드, [^,]*$|${String(questions.indexOf(B) + 1).padStart(2, "0")}번 카드, [^(]*· Card`) });
    await user.click(unused);
    expect(store.spies.drawCard).toHaveBeenCalledWith(B.id);
    expect(screen.queryByRole("dialog")).toBeNull(); // 서버 current가 없으니 오버레이도 없다
  });

  it("연결이 끊겨도(offline) 사용된 카드는 다시 볼 수 있다 — 로컬 상태만 쓴다", async () => {
    const user = userEvent.setup();
    store.set({ connection: "offline" });
    renderMain();
    await user.click(usedCard());
    expect(await screen.findByRole("dialog", { name: reviewDialogName })).toBeTruthy();
    expect(noMutationCalls()).toBe(true);
  });
});

describe("공유 카드 우선 / reset", () => {
  it("로컬 보기 중 서버 current가 생기면 로컬 보기는 닫히고 공유 카드가 열린다 — 동시에 두 오버레이는 없다", async () => {
    const user = userEvent.setup();
    renderMain();
    await user.click(usedCard());
    await screen.findByRole("dialog", { name: reviewDialogName });

    let maxDialogs = 0;
    const observer = new MutationObserver(() => {
      maxDialogs = Math.max(maxDialogs, document.querySelectorAll('[role="dialog"][aria-modal="true"]').length);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    store.set({ state: baseState({ current: { cardId: B.id, openedAt: 1, kind: "pick", by: "client-other" } }) });
    const shared = await screen.findByRole("dialog", { name: new RegExp(`카드 ${questions.indexOf(B) + 1}번$`) }, { timeout: 3000 });
    observer.disconnect();

    expect(within(shared).getByText(B.ko)).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: reviewDialogName })).toBeNull();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(maxDialogs).toBeLessThanOrEqual(1);
    expect(noMutationCalls()).toBe(true);

    // 공유 카드가 닫혀도 로컬 보기는 되살아나지 않는다
    store.set({ state: baseState({ current: null, used: [A.id, B.id] }) });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 3000 });
  });

  it("공유 카드가 열려 있는 동안엔 사용된 카드를 눌러도 로컬 보기가 열리지 않는다", async () => {
    const user = userEvent.setup();
    store.set({ state: baseState({ current: { cardId: B.id, openedAt: 1, kind: "pick", by: "client-other" } }) });
    renderMain();
    await screen.findByRole("dialog", { name: new RegExp(`카드 ${questions.indexOf(B) + 1}번$`) });
    await user.click(usedCard());
    expect(screen.queryByRole("dialog", { name: reviewDialogName })).toBeNull();
    expect(noMutationCalls()).toBe(true);
  });

  it("로컬 보기 중 reset(epoch 변경)이 와도 오류 없이 유지되고, 닫은 뒤 격자는 reset 상태를 따른다", async () => {
    const user = userEvent.setup();
    renderMain();
    await user.click(usedCard());
    await screen.findByRole("dialog", { name: reviewDialogName });

    store.set({ state: baseState({ epoch: 1, used: [], updatedAt: 2 }) });
    // 사용자가 닫을 때까지 그대로 둔다 — 질문은 계속 보인다
    expect(within(screen.getByRole("dialog", { name: reviewDialogName })).getByText(A.ko)).toBeTruthy();

    await waitFor(() => expect((screen.getByRole("button", { name: /카드 덮기/ }) as HTMLButtonElement).disabled).toBe(false));
    await user.click(screen.getByRole("button", { name: /카드 덮기/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 3000 });
    // reset 이후라 카드 1은 다시 '사용함'이 아니다
    expect(screen.queryByRole("button", { name: /사용함/ })).toBeNull();
    expect(noMutationCalls()).toBe(true);
  });
});

describe("랜덤 뽑기는 사용된 카드를 여전히 제외 (다시 보기는 사용 여부를 바꾸지 않는다)", () => {
  it("LocalMockRepository: 사용된 카드는 drawRandom에서 한 번도 안 나온다", async () => {
    const map = new Map<string, string>();
    const storage: KeyValueStorage = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
    let now = 1000;
    const repo = new LocalMockRepository({ storage, now: () => now, channelName: `t-${Math.random()}` });
    // A를 열었다 닫아 사용 처리
    await repo.drawCard({ table: 1, cardId: A.id, epoch: 0, clientId: "client-test-001" });
    now += 3000;
    expect((await repo.closeCard({ table: 1, cardId: A.id, epoch: 0, clientId: "client-test-001" })).status).toBe("closed");
    // (여기서 UI의 "다시 보기"는 repository를 부르지 않으므로 상태가 그대로다 — 위 테스트들이 증명)
    for (let i = 0; i < 30; i++) {
      const r = await repo.drawRandom({ table: 1, epoch: 0, clientId: "client-test-001" });
      expect(r.status).toBe("opened");
      expect(r.state?.current?.cardId).not.toBe(A.id);
      now += 3000;
      await repo.closeCard({ table: 1, cardId: r.state!.current!.cardId, epoch: 0, clientId: "client-test-001" });
    }
  });
});
