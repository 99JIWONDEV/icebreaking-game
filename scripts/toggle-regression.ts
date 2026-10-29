// 13 §4: 온디바이스 디버그 토글(shine/flip/layout/scrim/shadow/fix)이 카드 열기 자체를
// 망가뜨리지 않는지 재발 방지 회귀 테스트. 지금까지 시뮬레이션이 "정상"으로 나온 건
// 토글을 켰을 때 최종 화면(질문이 실제로 보이는지)을 검사한 적이 없었기 때문이다 —
// ?fix=ios가 카드 뒤집기를 망가뜨렸는데도(13_*.md) 아무 테스트도 못 잡았다.
//
// 각 케이스에서 카드 01을 연 뒤 2.5초 후: (a) 질문 텍스트가 보이는지(뒷면이 깨져서
// 번호만 보이는 상태가 아닌지), (b) 카드 자체의 타이트한 bounding box 스크린샷이 기본
// 케이스와 픽셀로 얼마나 다른지(타이트하게 잘라서 box-shadow/글로우 bleed는 자연히
// 빠진다 — shadow=off가 당연히 달라지는 건 카드 바깥쪽이라 안 잡힌다. shine은 2.5초면
// 거의 끝나 있어야 정상이다).
//
// 실행: node scripts/toggle-regression.ts (next dev 떠 있어야 함, ?local=1만 써서
// Convex 연결 불필요)
import { chromium, webkit, type Browser } from "playwright";

const BASE_URL = process.env.TOGGLE_BASE_URL ?? "http://localhost:3737";
const QUESTION_1_KO = "오늘 하루를 한 단어로 표현한다면 뭐가 될까요?";
const DIFF_WARN_PERCENT = 3; // 참고용 — shadow=off/flip=fade/layout=off는 당연히 바뀔 수 있어 실패 처리는 안 한다

const CASES: { label: string; query: string }[] = [
  { label: "기본", query: "" },
  { label: "?fix=ios", query: "fix=ios" },
  { label: "?flip=fade", query: "flip=fade" },
  { label: "?layout=off", query: "layout=off" },
  { label: "?scrim=off", query: "scrim=off" },
  { label: "?shadow=off", query: "shadow=off" },
  { label: "?shine=off", query: "shine=off" },
  { label: "?shine=v1", query: "shine=v1" },
  { label: "?shine=v4", query: "shine=v4" },
  { label: "?fix=ios&shadow=off", query: "fix=ios&shadow=off" },
  { label: "?flip=fade&scrim=off", query: "flip=fade&scrim=off" },
  { label: "?layout=off&fix=ios", query: "layout=off&fix=ios" },
];

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

function pixelDiffPercent(a: Buffer, b: Buffer, width: number, height: number, channels: number): number {
  if (a.length !== b.length) return 100;
  let diff = 0;
  const pixelCount = width * height;
  for (let i = 0; i < a.length; i += channels) {
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    if (d > 6) diff++;
  }
  return (diff / pixelCount) * 100;
}

async function runEngine(browser: Browser, engineLabel: string) {
  console.log(`\n=== ${engineLabel} ===`);
  const sharp = (await import("sharp")).default;
  let baselineBuf: Buffer | null = null;
  let baselineMeta: { width: number; height: number; channels: number } | null = null;
  const rows: { label: string; textVisible: boolean; diffPercent: string }[] = [];

  for (const c of CASES) {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
    const page = await context.newPage();
    const qs = c.query ? `&${c.query}` : "";
    await page.goto(`${BASE_URL}/?local=1${qs}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    if (await page.locator("#intro-splash").count()) await page.locator("#intro-splash").click();
    await page.waitForTimeout(300);
    await page.locator("input[inputmode=numeric]").first().fill("1");
    await page.getByRole("button", { name: /입장하기|Join/ }).click();
    await page.waitForTimeout(1000);
    // 카드 01 — 격자는 항상 번호 순서라 .first()가 01이다(시드 셔플 없음, v3 §4-1).
    await page.locator('button[data-card-id]:not([aria-disabled="true"])').first().click();
    await page.waitForTimeout(2500);

    const textVisible = await page
      .getByText(QUESTION_1_KO)
      .isVisible()
      .catch(() => false);

    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    const box = await dialog.boundingBox();
    let diffPercent = "n/a";
    if (box) {
      const buf = await page.screenshot({ clip: box });
      const { data, info } = await sharp(buf).resize(300, Math.round((300 * box.height) / box.width)).raw().toBuffer({ resolveWithObject: true });
      if (!baselineBuf) {
        baselineBuf = data;
        baselineMeta = { width: info.width, height: info.height, channels: info.channels };
        diffPercent = "0.00 (기준)";
      } else if (baselineMeta) {
        const pct = pixelDiffPercent(baselineBuf, data, baselineMeta.width, baselineMeta.height, baselineMeta.channels);
        diffPercent = pct.toFixed(2);
      }
    }

    check(`${c.label}: 질문 텍스트가 보인다(뒷면 안 깨짐)`, textVisible);
    rows.push({ label: c.label, textVisible, diffPercent });
    await context.close();
  }

  console.log(`\n${engineLabel} 결과표:`);
  console.log("케이스".padEnd(24), "질문 보임".padEnd(10), "기본 대비 차이%(참고, 300px 축소)");
  for (const r of rows) {
    console.log(r.label.padEnd(24), String(r.textVisible).padEnd(10), r.diffPercent, Number(r.diffPercent) > DIFF_WARN_PERCENT ? "  <- 참고: 차이 큼(의도된 변화일 수 있음)" : "");
  }
}

async function main() {
  console.log(`toggle-regression.ts — ${BASE_URL}`);
  const chromiumBrowser = await chromium.launch();
  try {
    await runEngine(chromiumBrowser, "Chromium");
  } finally {
    await chromiumBrowser.close();
  }

  const webkitBrowser = await webkit.launch();
  try {
    await runEngine(webkitBrowser, "WebKit");
  } finally {
    await webkitBrowser.close();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
