// 17: "사용된 카드 다시 보기(보기 전용)" 회귀 테스트 — 진짜 브라우저(Chromium + WebKit)에서 확인한다.
//  (1) 카드 열기 → 닫기 → 같은 카드(사용됨) 다시 탭 → 질문이 보이고(회전 각도에 맞는 면만 보임)
//      "다시 보기" 표시가 있고, 닫기 버튼이 minOpenMs 게이트 없이 바로 켜진다
//  (2) 다시 보기를 열고 닫는 동안 localStorage(= LocalMockRepository가 쓰는 상태)가 1바이트도 안 바뀐다
//      — repository/mutation을 안 불렀다는 증거(?local=1이라 모든 쓰기는 localStorage로 간다)
//  (3) 닫은 뒤에도 카드는 '사용함', 랜덤 뽑기는 그 카드를 안 뽑는다
//  (4) 다른 탭(같은 기기)이 새 카드를 열면 로컬 보기는 닫히고 공유 카드가 열린다 —
//      그 전환 내내 [role=dialog][aria-modal] 가 동시에 2개 이상인 프레임이 0
// 실행: node scripts/review-regression.ts (next start 또는 next dev가 떠 있어야 함. dev는 Next 오버레이
// 다이얼로그가 선택자와 겹치니 production 빌드 권장). Convex 연결 불필요(?local=1).
import { chromium, webkit, type Browser, type Page } from "playwright";
// 17: 사용된 카드도 이제 눌린다(다시 보기) — aria-disabled가 더는 "사용됨"을 뜻하지 않으니 라벨로 미사용 카드를 고른다.
const UNUSED_CARD = 'button[data-card-id]:not([aria-label*="사용함"]):not([aria-label*=", used"])';

const BASE_URL = process.env.REVIEW_BASE_URL ?? "http://localhost:3737";
const SHOT_DIR = process.env.REVIEW_SHOT_DIR;
const DIALOG = '[role="dialog"][aria-modal="true"]';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✖ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function enterMain(page: Page) {
  await page.goto(`${BASE_URL}/?local=1`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  if (await page.locator("#intro-splash").count()) await page.locator("#intro-splash").click();
  await page.waitForTimeout(300);
  const input = page.locator("input[inputmode=numeric]").first();
  if (await input.count()) {
    await input.fill("1");
    await page.getByRole("button", { name: /입장하기|Join/ }).click();
  }
  await page.waitForTimeout(900);
}

const snapshot = (page: Page) => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort())));

async function shot(page: Page, engine: string, name: string) {
  if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/${engine}_${name}.png` });
}

async function runEngine(label: string, browser: Browser) {
  console.log(`\n=== ${label} ===`);
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });
  const page = await context.newPage();
  await enterMain(page);

  // (1) 카드 열기 → 닫기
  const firstUnused = page.locator(UNUSED_CARD).first();
  const cardId = await firstUnused.getAttribute("data-card-id");
  await firstUnused.click();
  await page.locator(DIALOG).waitFor();
  await page.waitForTimeout(2600);
  await page.getByRole("button", { name: /카드 덮기|Close card/ }).click();
  await page.locator(DIALOG).waitFor({ state: "detached", timeout: 5000 });
  await page.waitForTimeout(500);

  const usedTile = page.locator(`button[data-card-id="${cardId}"]`);
  const label0 = (await usedTile.getAttribute("aria-label")) ?? "";
  check("닫은 카드는 '사용함 · 눌러서 다시 보기' 이름의 활성 버튼", /사용함/.test(label0) && /다시 보기|review/i.test(label0) && (await usedTile.getAttribute("aria-disabled")) === "false", label0);
  await shot(page, label.toLowerCase(), "01_grid_with_used");

  // (2) 다시 보기: 열기 — 상태 스냅샷 동일해야 한다
  const before = await snapshot(page);
  await usedTile.click();
  await page.locator(DIALOG).waitFor();
  await page.waitForTimeout(1700); // 뒤집기 연출이 끝날 때까지
  const faces = await page.evaluate((sel) => {
    const rotator = document.querySelector(sel)?.firstElementChild;
    const [numberFace, questionFace] = [rotator?.children[0], rotator?.children[1]] as HTMLElement[];
    return {
      number: getComputedStyle(numberFace).opacity,
      question: getComputedStyle(questionFace).opacity,
      text: document.querySelector(sel)?.textContent ?? "",
    };
  }, DIALOG);
  check("뒤집힌 뒤 질문 면만 보인다(번호 면 opacity 0, 질문 면 1)", faces.number === "0" && faces.question === "1", JSON.stringify(faces));
  check("질문 텍스트(한국어 문단)가 보인다", await page.locator(`${DIALOG} p[lang="ko"]`).isVisible());
  check("'다시 보기' 표시가 있다", /다시 보기/.test(faces.text) && /Review/.test(faces.text));
  await shot(page, label.toLowerCase(), "02_review_open");

  const closeBtn = page.getByRole("button", { name: /카드 덮기|Close card/ });
  check("닫기 버튼이 minOpenMs 게이트 없이 켜져 있다", await closeBtn.isEnabled());
  check("다시 보기를 여는 동안 localStorage 상태가 그대로(repository 호출 없음)", (await snapshot(page)) === before);

  // 닫기(ESC) — 같은 연출로 닫히고 상태는 그대로
  await page.keyboard.press("Escape");
  await page.locator(DIALOG).waitFor({ state: "detached", timeout: 5000 });
  await page.waitForTimeout(400);
  check("닫은 뒤에도 localStorage 상태가 그대로", (await snapshot(page)) === before);
  check("닫은 뒤에도 카드는 '사용함'", /사용함/.test((await usedTile.getAttribute("aria-label")) ?? ""));
  check("닫으면 포커스가 눌렀던 카드로 돌아온다", await page.evaluate((id) => document.activeElement?.getAttribute("data-card-id") === id, cardId));

  // (3) 랜덤 뽑기는 사용된 카드를 안 뽑는다(여러 번 — 서버/로컬 규칙 자체는 단위 테스트가 30회 검증)
  const usedNumber = Number(/(\d+)번 카드/.exec(label0)?.[1]);
  let randomOk = true;
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: /랜덤으로 뽑기|Draw at random/ }).click();
    await page.locator(DIALOG).waitFor();
    await page.waitForTimeout(1500);
    const labelledBy = await page.locator(DIALOG).getAttribute("aria-labelledby");
    const title = (await page.locator(`[id="${labelledBy}"]`).textContent()) ?? "";
    if (Number(/(\d+)/.exec(title)?.[1]) === usedNumber) randomOk = false;
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /카드 덮기|Close card/ }).click();
    await page.locator(DIALOG).waitFor({ state: "detached", timeout: 5000 });
    await page.waitForTimeout(400);
  }
  check("랜덤 뽑기 3회 모두 사용된 카드를 뽑지 않았다", randomOk);

  // (4) 공유 카드 우선: 로컬 보기 중 다른 탭이 새 카드를 연다
  const anotherUsed = page.locator('button[data-card-id][aria-label*="사용함"]').first();
  await anotherUsed.click();
  await page.locator(DIALOG).waitFor();
  await page.waitForTimeout(1200);
  await page.evaluate((sel) => {
    (window as unknown as { __maxDialogs: number }).__maxDialogs = 0;
    new MutationObserver(() => {
      const w = window as unknown as { __maxDialogs: number };
      w.__maxDialogs = Math.max(w.__maxDialogs, document.querySelectorAll(sel).length);
    }).observe(document.body, { childList: true, subtree: true, attributes: true });
  }, DIALOG);
  const reviewTitle = await page.locator(DIALOG).getAttribute("aria-labelledby").then((id) => page.locator(`[id="${id}"]`).textContent());

  const other = await context.newPage(); // 같은 기기의 다른 탭 = 같은 테이블의 다른 사람 흉내(BroadcastChannel 동기화)
  await enterMain(other);
  const otherUnused = other.locator(UNUSED_CARD).first();
  const otherCard = await otherUnused.getAttribute("data-card-id");
  await otherUnused.click();
  await other.locator(DIALOG).waitFor();

  await page.waitForFunction((t) => {
    const d = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
    return d.length === 1 && !document.getElementById(d[0].getAttribute("aria-labelledby")!)?.textContent?.includes(t as string);
  }, reviewTitle, { timeout: 8000 });
  await page.waitForTimeout(1800);
  const maxDialogs = await page.evaluate(() => (window as unknown as { __maxDialogs: number }).__maxDialogs);
  const nowTitle = await page.locator(DIALOG).getAttribute("aria-labelledby").then((id) => page.locator(`[id="${id}"]`).textContent());
  check("공유 카드가 열려 로컬 보기를 대체했다(제목이 다른 카드, '다시 보기' 아님)", !!nowTitle && !/다시 보기/.test(nowTitle) && nowTitle !== reviewTitle, `${reviewTitle} → ${nowTitle}`);
  check("전환 내내 다이얼로그는 동시에 1개 이하", maxDialogs <= 1, `max=${maxDialogs}`);
  const otherTitle = await other.locator(DIALOG).getAttribute("aria-labelledby").then((id) => other.locator(`[id="${id}"]`).textContent());
  check("이 탭의 공유 카드는 다른 탭이 연 카드와 같은 카드다", !!otherCard && !!otherTitle && nowTitle === otherTitle, `${nowTitle} vs ${otherTitle}`);
  await shot(page, label.toLowerCase(), "03_shared_takes_over");

  await context.close();
}

async function main() {
  console.log(`review-regression.ts — ${BASE_URL}`);
  for (const [label, launcher] of [["Chromium", chromium], ["WebKit", webkit]] as const) {
    const browser = await launcher.launch();
    try {
      await runEngine(label, browser);
    } finally {
      await browser.close();
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
