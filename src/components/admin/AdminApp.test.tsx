// @vitest-environment jsdom
// 16: 관리자 페이지 컴포넌트 테스트 — Convex 훅은 목이다. 실제 서버 응답/실시간 갱신/잠금 시간은
// 여기서 검증되지 않는다(서버 로직은 convex/admin.test.ts, 실서버 E2E는 미검증 — 폰에서 확인 필요).
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DUMMY = "dummy-component-test-passcode";

type Handler = (args: Record<string, unknown>) => unknown;
const h = vi.hoisted(() => ({
  mutations: {} as Record<string, Handler>,
  calls: [] as { name: string; args: Record<string, unknown> }[],
  tables: [] as { tableNo: number; openedCount: number; epoch: number; updatedAt: number | null }[],
}));

vi.mock("convex/react", async () => {
  const { getFunctionName } = await import("convex/server");
  return {
    useMutation: (ref: never) => {
      const name = getFunctionName(ref);
      return async (args: Record<string, unknown>) => {
        h.calls.push({ name, args });
        return h.mutations[name]?.(args);
      };
    },
    useQuery: (ref: never, args: unknown) => {
      const name = getFunctionName(ref);
      if (args === "skip") return undefined;
      if (name === "admin:listTables") return { status: "ok", tables: h.tables, total: 55 };
      if (name === "admin:recentLog") return { status: "ok", rows: [] };
      return undefined;
    },
  };
});
vi.mock("@/app/ConvexClientProvider", () => ({ convexClient: {} }));

import { AdminApp } from "@/components/admin/AdminApp";

const NOW = Date.now();

beforeEach(() => {
  // jsdom에는 <dialog>.showModal/close가 없다 — 열림 상태만 흉내낸다.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  h.calls.length = 0;
  h.mutations = {
    "admin:checkPasscode": (a) =>
      a.passcode === DUMMY ? { status: "ok", token: "t".repeat(64) } : { status: "denied" },
    "admin:resetTable": () => ({ status: "ok", openedBefore: 12 }),
    "admin:resetAllTables": () => ({ status: "ok", done: true, tablesReset: 20, openedBefore: 15 }),
    "admin:signOut": () => ({ status: "ok" }),
  };
  h.tables = Array.from({ length: 20 }, (_, i) => ({
    tableNo: i + 1,
    openedCount: i === 6 ? 12 : i === 1 ? 3 : 0,
    epoch: 0,
    updatedAt: i === 6 || i === 1 ? NOW - 3 * 60_000 : null,
  }));
  window.history.replaceState(null, "", "/admin");
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => cleanup());

async function login(passcode = DUMMY) {
  const user = userEvent.setup();
  render(<AdminApp />);
  await user.type(screen.getByLabelText(/관리자 비밀번호/), passcode);
  await user.click(screen.getByRole("button", { name: /확인/ }));
  return user;
}

describe("관리자 페이지 — 접근/로그인", () => {
  it("로컬 모드(?local=1)에서는 빈 화면이 아니라 안내 문구를 보여 준다", () => {
    window.history.replaceState(null, "", "/admin?local=1");
    render(<AdminApp />);
    expect(screen.getByText(/서버 모드에서만 사용할 수 있습니다/)).toBeTruthy();
    expect(screen.queryByLabelText(/관리자 비밀번호/)).toBeNull();
  });

  it("비밀번호 입력은 type=password, autocomplete=off", () => {
    render(<AdminApp />);
    const input = screen.getByLabelText(/관리자 비밀번호/) as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(input.autocomplete).toBe("off");
  });

  it("값이 비어 있으면 확인 버튼이 비활성", () => {
    render(<AdminApp />);
    expect((screen.getByRole("button", { name: /확인/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("틀리면 '비밀번호가 올바르지 않습니다'", async () => {
    await login("wrong-passcode");
    expect(await screen.findByText(/비밀번호가 올바르지 않습니다/)).toBeTruthy();
    expect(screen.queryByText(/관리자 · Admin/, { selector: "h1:not(.sr-only)" })).toBeNull();
  });

  it("잠금 중이면 남은 시간을 분 단위로 알려 준다(올바른 비밀번호여도)", async () => {
    h.mutations["admin:checkPasscode"] = () => ({ status: "locked", retryAfterMs: 8 * 60_000 + 20_000 });
    await login();
    expect(await screen.findByText(/9분 뒤에 다시 시도하세요/)).toBeTruthy();
  });

  it("설정 안 됨은 별도 문구", async () => {
    h.mutations["admin:checkPasscode"] = () => ({ status: "not_configured" });
    await login();
    expect(await screen.findByText(/관리자 기능이 설정되지 않았습니다/)).toBeTruthy();
  });

  it("서버 호출이 던지면 연결 실패 문구(비밀번호 틀림과 구분)", async () => {
    h.mutations["admin:checkPasscode"] = () => {
      throw new Error("network");
    };
    await login();
    expect(await screen.findByText(/요청에 실패했어요/)).toBeTruthy();
  });

  it("성공하면 테이블 격자가 보이고, passcode는 storage/쿠키/URL 어디에도 없다", async () => {
    await login();
    expect(await screen.findByRole("button", { name: /테이블\s+7\s*열린 카드\s+12\/55/ })).toBeTruthy();
    expect(screen.getAllByRole("button", { pressed: false }).length).toBeGreaterThanOrEqual(20);
    const everywhere = JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
      cookie: document.cookie,
      url: window.location.href,
    });
    expect(everywhere).not.toContain(DUMMY);
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });
});

describe("관리자 페이지 — 초기화", () => {
  it("선택이 없으면 '선택한 테이블 초기화'가 비활성, 선택하면 번호가 붙어 활성", async () => {
    const user = await login();
    const reset = await screen.findByRole("button", { name: /선택한 테이블 초기화/ });
    expect((reset as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: /테이블\s+7\s*열린 카드\s+12\/55/ }));
    const enabled = screen.getByRole("button", { name: /Reset table 7/ }) as HTMLButtonElement;
    expect(enabled.disabled).toBe(false);
    expect(screen.getByRole("button", { name: /테이블\s+7\s*열린 카드\s+12\/55/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("단일: 확인 대화상자에 영향 범위를 보여 주고, 취소하면 서버를 호출하지 않는다", async () => {
    const user = await login();
    await user.click(await screen.findByRole("button", { name: /테이블\s+7\s*열린 카드\s+12\/55/ }));
    await user.click(screen.getByRole("button", { name: /Reset table 7/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/7번 테이블의 열린 카드 12장을 처음 상태로 되돌립니다\. 되돌릴 수 없습니다\./)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: /취소/ }));
    expect(h.calls.some((c) => c.name === "admin:resetTable")).toBe(false);
  });

  it("단일: 초기화를 누르면 passcode+tableNo로 호출하고 결과를 안내한다", async () => {
    const user = await login();
    await user.click(await screen.findByRole("button", { name: /테이블\s+7\s*열린 카드\s+12\/55/ }));
    await user.click(screen.getByRole("button", { name: /Reset table 7/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /초기화/ }));
    await waitFor(() => expect(h.calls.find((c) => c.name === "admin:resetTable")).toBeTruthy());
    expect(h.calls.find((c) => c.name === "admin:resetTable")?.args).toEqual({ passcode: DUMMY, tableNo: 7 });
    expect(await screen.findByText(/7번 테이블을 초기화했어요/)).toBeTruthy();
  });

  it("전체: '전체'를 입력하기 전에는 초기화 버튼이 비활성, 영향 범위(테이블 수·총 카드 수) 표시", async () => {
    const user = await login();
    await user.click(await screen.findByRole("button", { name: /Reset all tables/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/전체 20개 테이블, 열린 카드 총 15장/)).toBeTruthy();
    const confirmBtn = within(dialog).getByRole("button", { name: /^초기화/ }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    await user.type(within(dialog).getByLabelText(/계속하려면/), "전");
    expect(confirmBtn.disabled).toBe(true); // 부분 일치는 안 된다
    await user.type(within(dialog).getByLabelText(/계속하려면/), "체");
    expect(confirmBtn.disabled).toBe(false);
    await user.click(confirmBtn);
    await waitFor(() => expect(h.calls.find((c) => c.name === "admin:resetAllTables")?.args).toEqual({ passcode: DUMMY }));
    expect(await screen.findByText(/전체 20개 테이블을 초기화했어요/)).toBeTruthy();
  });

  it("서버가 거부하면(예: 잠금) 대화상자에 오류가 남고 닫히지 않는다", async () => {
    h.mutations["admin:resetTable"] = () => ({ status: "locked", retryAfterMs: 5 * 60_000 });
    const user = await login();
    await user.click(await screen.findByRole("button", { name: /테이블\s+7\s*열린 카드\s+12\/55/ }));
    await user.click(screen.getByRole("button", { name: /Reset table 7/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /초기화/ }));
    expect(await screen.findByText(/5분 뒤에 다시 시도하세요/)).toBeTruthy();
    expect(screen.getByRole("dialog").hasAttribute("open")).toBe(true);
  });
});

describe("관리자 페이지 — 로그아웃", () => {
  it("나가기를 누르면 로그인 화면으로 돌아가고 입력/상태가 비워지며 서버 세션도 폐기 요청", async () => {
    const user = await login();
    await screen.findByRole("button", { name: /테이블\s+7\s*열린 카드\s+12\/55/ });
    await user.click(screen.getByRole("button", { name: /나가기/ }));
    const input = (await screen.findByLabelText(/관리자 비밀번호/)) as HTMLInputElement;
    expect(input.value).toBe("");
    expect(h.calls.find((c) => c.name === "admin:signOut")?.args).toEqual({ token: "t".repeat(64) });
    // 로그아웃 뒤에는 이전 passcode로 서버 호출이 나갈 경로가 없다
    const before = h.calls.length;
    await act(async () => {});
    expect(h.calls.length).toBe(before);
  });
});
