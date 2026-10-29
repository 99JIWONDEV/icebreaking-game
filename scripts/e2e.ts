// Playwright E2E — 두 브라우저 컨텍스트로 03_table-sync-spec.md §4 규칙 #2/#4/#12/#13과
// 재접속/로컬 폴백(§4 "연결이 오래 끊길 때")을 검증한다.
// `next dev`(기본 http://localhost:3737)와 `npx convex dev`가 둘 다 떠 있어야 한다.
// 실행: node scripts/e2e.ts
//
// 관리자 비밀번호가 필요한 "진행자가 초기화" UI(규칙 #9)는 여기 포함하지 않는다 — 그 값을
// 읽거나 출력하거나 파일에 쓰지 않기로 했기 때문. convex/tables.test.ts의 "초기화 경합"
// 단위 테스트가 서버 로직은 이미 커버한다.
//
// plain `playwright` 패키지만 설치돼 있어(`@playwright/test` 아님) test()/expect() 러너가
// 없다 — Locator API(자동 대기 포함)는 그대로 쓰되, 체크는 직접 만든 check()로 기록한다.
import { chromium, type Browser, type BrowserContext, type Page, type WebSocketRoute } from "playwright";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3737";
const TABLE = Number(process.env.E2E_TABLE ?? 2); // concurrency.ts(20), load.ts(6~20)와 안 겹치는 테이블

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✖ ${name}`);
  }
}

async function dismissSplash(page: Page) {
  const splash = page.locator("#intro-splash");
  if (await splash.isVisible().catch(() => false)) {
    await splash.click();
  }
}

async function openTable(browser: Browser, table: number): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/?t=${table}`);
  await dismissSplash(page);
  await page.waitForSelector('button[data-card-id]', { timeout: 10_000 });
  return { context, page };
}

function openCardDialog(page: Page) {
  // vaul MenuDrawer도 role="dialog"라 — 닫혀 있어도 DOM에 남는다. aria-modal="true"는
  // OpenCardOverlay의 카드 다이얼로그만 갖는다.
  return page.locator('[role="dialog"][aria-modal="true"]');
}

function anyOpenCardButton(page: Page) {
  return page.locator('button[data-card-id]:not([aria-disabled="true"])').first();
}

async function closeOpenCardIfAny(page: Page) {
  // CloseButtonRing은 OpenCardOverlay의 role="dialog" div와 형제(sibling) 요소라
  // dialog 안에서 찾으면 안 된다 — 페이지 전체에서 찾는다.
  const closeBtn = page.getByRole("button", { name: /카드 덮기|Close card/ });
  if (!(await closeBtn.isVisible().catch(() => false))) return;
  await page.waitForTimeout(2200); // minOpenMs(2000ms) 게이트
  await closeBtn.click();
  await closeBtn.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
}

async function testRule2And13(browser: Browser) {
  console.log("1) 규칙 #2 (열린 카드가 있으면 격자 비활성) + #13 (카테고리 필터와 무관하게 열린 카드가 보임)");
  const a = await openTable(browser, TABLE);
  const b = await openTable(browser, TABLE);
  try {
    await closeOpenCardIfAny(a.page);

    // B는 다른 카테고리를 보고 있는 상태로 둔다
    await b.page.getByRole("button", { name: /메뉴 열기|Open menu/ }).click();
    await b.page.getByRole("button", { name: /추억|Memories/ }).click();

    const card = anyOpenCardButton(a.page);
    await card.click();

    await openCardDialog(a.page).waitFor({ state: "visible", timeout: 5000 });
    check("A: 카드를 누르면 dialog가 뜬다", true);

    await openCardDialog(b.page).waitFor({ state: "visible", timeout: 5000 });
    check("B: 다른 카테고리를 보고 있어도 같은 카드가 열린다(#13)", true);

    const inertCount = await b.page.locator("div[inert]").count();
    check("B: 카드가 열린 동안 격자 영역이 inert 처리된다(#2)", inertCount > 0);
  } finally {
    await closeOpenCardIfAny(a.page);
    await a.context.close();
    await b.context.close();
  }
}

async function testRule4(browser: Browser) {
  console.log("2) 규칙 #4 (덮은 직후 다른 사람이 새 카드를 열 수 있다)");
  const a = await openTable(browser, TABLE);
  const b = await openTable(browser, TABLE);
  try {
    await closeOpenCardIfAny(a.page);
    await anyOpenCardButton(a.page).click();
    await openCardDialog(a.page).waitFor({ state: "visible", timeout: 5000 });
    await closeOpenCardIfAny(a.page);

    await openCardDialog(b.page).waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    await anyOpenCardButton(b.page).click();
    await openCardDialog(b.page).waitFor({ state: "visible", timeout: 5000 });
    check("B: A가 덮은 직후 새 카드를 열 수 있다(#4)", true);
    await closeOpenCardIfAny(b.page);
  } finally {
    await a.context.close();
    await b.context.close();
  }
}

async function testRule12(browser: Browser) {
  console.log("3) 규칙 #12 (메뉴에서 테이블 번호 변경 → 구독이 새 테이블로 교체)");
  const { context, page } = await openTable(browser, TABLE);
  try {
    const otherTable = TABLE === 2 ? 3 : 2;
    await page.getByRole("button", { name: /메뉴 열기|Open menu/ }).click();
    await page.getByRole("button", { name: /테이블 변경|Change table/ }).click();
    await page.locator('input[inputmode="numeric"]').fill(String(otherTable));
    // mode="both"에서는 "확인 · Confirm"처럼 합쳐진 텍스트라 정확히 일치시키지 않는다
    // (카테고리 셀렉션 버튼 등 다른 "확인" 포함 텍스트와 안 겹치는 건 lg 사이즈 fill 버튼 하나뿐이라 안전).
    await page.getByRole("button", { name: /확인|Confirm/ }).click();
    await page.getByRole("button", { name: /확인|Confirm/ }).click();
    await page.waitForSelector('button[data-card-id]', { timeout: 10_000 });
    check(`테이블 변경 후 ${otherTable}번 테이블 격자가 렌더링된다(#12)`, true);
  } finally {
    await context.close();
  }
}

/**
 * context.setOffline()은 새 요청만 막고 이미 열려 있는 WebSocket은 끊지 않는다(실측 확인 —
 * setOffline(true) 후 19초를 기다려도 Convex 연결이 reconnecting으로 안 바뀜. Playwright/CDP의
 * 알려진 한계). 그래서 page.routeWebSocket으로 Convex 소켓 자체를 가로채 "끊긴 척"한다:
 * 연결을 서버로 그대로 중계하다가, blocked가 되면 현재 연결을 닫고 이후 재연결 시도는
 * 서버에 붙이지 않고 즉시 닫아 "계속 끊긴 상태"를 흉내 낸다.
 */
async function openTableWithWsControl(browser: Browser, table: number) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  let blocked = false;
  let current: WebSocketRoute | null = null;

  await page.routeWebSocket(/convex\.cloud/, (ws) => {
    if (blocked) {
      ws.close();
      return;
    }
    current = ws.connectToServer();
  });

  function setBlocked(value: boolean) {
    blocked = value;
    if (value) current?.close().catch(() => {});
  }

  await page.goto(`${BASE_URL}/?t=${table}`);
  await dismissSplash(page);
  await page.waitForSelector('button[data-card-id]', { timeout: 10_000 });
  return { context, page, setBlocked };
}

async function testReconnectAndLocalFallback(browser: Browser) {
  console.log("4) 재접속 / 로컬 폴백 (연결이 오래 끊길 때)");
  const { context, page, setBlocked } = await openTableWithWsControl(browser, TABLE);
  try {
    setBlocked(true);
    await page.getByText(/연결이 끊겼어요|Connection lost/).waitFor({ state: "visible", timeout: 15_000 });
    check("연결이 끊기면 배너가 뜬다", true);

    const fallbackBtn = page.getByRole("button", { name: /이 기기에서만 진행할 수 있어요|continue on this device only/ });
    await fallbackBtn.waitFor({ state: "visible", timeout: 35_000 }); // LOCAL_FALLBACK_TIMEOUT_MS(30s)
    check("30초 경과 후 로컬 폴백 버튼이 노출된다", true);

    await fallbackBtn.click();
    const card = anyOpenCardButton(page);
    await card.click();
    await openCardDialog(page).waitFor({ state: "visible", timeout: 5000 });
    check("로컬 폴백 모드에서 카드 열기가 동작한다(네트워크 없이)", true);
    await closeOpenCardIfAny(page);

    setBlocked(false);
    const backBtn = page.getByRole("button", { name: /서버로 돌아가기|Back to server/ });
    await backBtn.waitFor({ state: "visible", timeout: 15_000 });
    check("재연결 후 '서버로 돌아가기' 버튼이 노출된다", true);
  } finally {
    setBlocked(false);
    await context.close();
  }
}

async function main() {
  console.log(`e2e.ts — ${BASE_URL}, 테이블 ${TABLE}\n`);
  const browser = await chromium.launch();
  try {
    await testRule2And13(browser);
    await testRule4(browser);
    await testRule12(browser);
    await testReconnectAndLocalFallback(browser);
  } finally {
    await browser.close();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
