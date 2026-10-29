// 14 §A-3: 카드 뒤집기 동안 "거울상 면이 보이는" 재발 방지 테스트. backface-visibility
// 속성 하나에 기대지 않고 회전 각도(rotateY)에서 opacity를 직접 파생시키는 게 수정의
// 핵심이라(OpenCardOverlay.tsx), 이 테스트는 그 각도-가시성 대응을 프레임 단위로 검증한다.
// 두 번 돌린다: (1) 보통 상태, (2) backface-visibility를 `visible !important`로 무력화한
// 상태 — iOS WebKit이 이 속성을 무시/불안정하게 처리하는 상황을 흉내 낸다. 두 경우 모두
// 위반 프레임이 0이어야 속성에 의존하지 않는 것이다.
//
// 실행: node scripts/flip-visibility-regression.ts (next dev 떠 있어야 함, ?local=1만 써서
// Convex 연결 불필요)
import { chromium, webkit, type Browser, type Page } from "playwright";

const BASE_URL = process.env.FLIP_BASE_URL ?? "http://localhost:3737";
const NEUTRALIZE_CSS = `
  * {
    backface-visibility: visible !important;
    -webkit-backface-visibility: visible !important;
  }
`;

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

type Sample = { t: number; angle: number; numberOpacity: number; questionOpacity: number };

/** matrix3d(...)에서 순수 rotateY(θ) 성분을 뽑는다 — 이 요소엔 rotateY만 걸려 있다
 *  (translateZ 등은 면 쪽에 있지 회전 컨테이너 자체엔 없다). θ = atan2(m[8], m[0]). */
async function sampleOnce(page: Page): Promise<Sample | null> {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (!dialog) return null;
    const rotator = dialog.firstElementChild;
    if (!rotator) return null;
    const numberFace = rotator.children[0] as HTMLElement | undefined;
    const questionFace = rotator.children[1] as HTMLElement | undefined;
    if (!numberFace || !questionFace) return null;

    const t = getComputedStyle(rotator).transform;
    let angle = 0;
    if (t && t !== "none") {
      const m = t.startsWith("matrix3d")
        ? t
            .slice(9, -1)
            .split(",")
            .map((n) => parseFloat(n))
        : null;
      if (m && m.length === 16) {
        angle = (Math.atan2(m[8], m[0]) * 180) / Math.PI;
      }
    }
    const norm = ((angle % 360) + 360) % 360;
    return {
      t: performance.now(),
      angle: norm,
      numberOpacity: parseFloat(getComputedStyle(numberFace).opacity),
      questionOpacity: parseFloat(getComputedStyle(questionFace).opacity),
    };
  });
}

async function sampleDuring(page: Page, totalMs: number, stepMs: number): Promise<Sample[]> {
  const samples: Sample[] = [];
  const t0 = Date.now();
  while (Date.now() - t0 < totalMs) {
    const s = await sampleOnce(page);
    if (s) samples.push(s);
    await page.waitForTimeout(stepMs);
  }
  return samples;
}

function evaluateSamples(samples: Sample[]) {
  // "보인다"의 임계값 — opacity 0.05 이상이면 보이는 것으로 친다(반올림 오차 여유).
  const VISIBLE = 0.05;
  let numberVisibleWhenShouldHide = 0; // angle >= 90인데 번호 면이 보임
  let questionVisibleWhenShouldHide = 0; // angle < 90인데 질문 면이 보임
  let bothVisible = 0; // 두 면이 동시에 보임(경계 1프레임 이내여야 함)
  for (const s of samples) {
    const numberShouldBeVisible = s.angle < 90;
    const questionShouldBeVisible = s.angle >= 90;
    if (!numberShouldBeVisible && s.numberOpacity > VISIBLE) numberVisibleWhenShouldHide++;
    if (!questionShouldBeVisible && s.questionOpacity > VISIBLE) questionVisibleWhenShouldHide++;
    if (s.numberOpacity > VISIBLE && s.questionOpacity > VISIBLE) bothVisible++;
  }
  return { total: samples.length, numberVisibleWhenShouldHide, questionVisibleWhenShouldHide, bothVisible };
}

async function openAndSample(page: Page, table: number) {
  await page.goto(`${BASE_URL}/?local=1`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  if (await page.locator("#intro-splash").count()) await page.locator("#intro-splash").click();
  await page.waitForTimeout(300);
  await page.locator("input[inputmode=numeric]").first().fill(String(table));
  await page.getByRole("button", { name: /입장하기|Join/ }).click();
  await page.waitForTimeout(1000);
  await page.locator('button[data-card-id]:not([aria-disabled="true"])').first().click();
  // cardFlipTransition: delay 250ms + duration 600ms = 850ms 완료 — 여유를 두고 1000ms 샘플.
  const openSamples = await sampleDuring(page, 1000, 20);

  await page.waitForTimeout(1300); // MIN_OPEN_MS(2000ms) 게이트가 끝날 때까지 더 대기
  await page.getByRole("button", { name: /카드 덮기|Close card/ }).click();
  // cardCloseFlipTransition: duration 520ms — 여유를 두고 800ms 샘플.
  const closeSamples = await sampleDuring(page, 800, 20);

  return { openSamples, closeSamples };
}

async function runEngine(browser: Browser, engineLabel: string, neutralize: boolean) {
  const label = `${engineLabel}${neutralize ? " (backface-visibility 무력화)" : ""}`;
  console.log(`\n=== ${label} ===`);
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();
  if (neutralize) {
    await page.addInitScript(() => {}); // no-op, addStyleTag는 goto 이후에만 가능해서 아래서 처리
  }
  await page.goto(`${BASE_URL}/?local=1`, { waitUntil: "domcontentloaded" });
  if (neutralize) {
    await page.addStyleTag({ content: NEUTRALIZE_CSS });
  }
  const { openSamples, closeSamples } = await openAndSample(page, neutralize ? 2 : 3);

  const openResult = evaluateSamples(openSamples);
  const closeResult = evaluateSamples(closeSamples);

  console.log(
    `  열기: 샘플 ${openResult.total}개, 번호 면 위반 ${openResult.numberVisibleWhenShouldHide}, 질문 면 위반 ${openResult.questionVisibleWhenShouldHide}, 동시 노출 ${openResult.bothVisible}`,
  );
  console.log(
    `  닫기: 샘플 ${closeResult.total}개, 번호 면 위반 ${closeResult.numberVisibleWhenShouldHide}, 질문 면 위반 ${closeResult.questionVisibleWhenShouldHide}, 동시 노출 ${closeResult.bothVisible}`,
  );

  check(`${label}: 열기 — 각도에 안 맞는 번호 면 노출 0`, openResult.numberVisibleWhenShouldHide === 0);
  check(`${label}: 열기 — 각도에 안 맞는 질문 면 노출 0`, openResult.questionVisibleWhenShouldHide === 0);
  check(`${label}: 열기 — 동시 노출 1프레임 이내`, openResult.bothVisible <= 1);
  check(`${label}: 닫기 — 각도에 안 맞는 번호 면 노출 0`, closeResult.numberVisibleWhenShouldHide === 0);
  check(`${label}: 닫기 — 각도에 안 맞는 질문 면 노출 0`, closeResult.questionVisibleWhenShouldHide === 0);
  check(`${label}: 닫기 — 동시 노출 1프레임 이내`, closeResult.bothVisible <= 1);

  await context.close();
}

async function main() {
  console.log(`flip-visibility-regression.ts — ${BASE_URL}`);
  for (const [engineLabel, launcher] of [
    ["Chromium", chromium],
    ["WebKit", webkit],
  ] as const) {
    const browser = await launcher.launch();
    try {
      await runEngine(browser, engineLabel, false);
      await runEngine(browser, engineLabel, true);
    } finally {
      await browser.close();
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
