#!/usr/bin/env node
// WCAG 2.1 contrast checker for the v3("검정 버튼") 팔레트. accent는 삭제됐다 — 남은
// 유채색은 danger뿐이다. Values below are kept in sync by hand with src/app/globals.css's
// @theme block — if you change a token there, update the matching constant here too.

/** @type {Record<string, string>} */
const TOKENS = {
  canvas: "#FAFAF9",
  paper: "#FFFFFF",
  ink: "#171717",
  "ink-soft": "#3A3A37",
  "ink-sub": "#6B6B66",
  hairline: "#E4E4E0",
  "line-strong": "#8C8C87",
  "fill-weak": "#EEEEEC",
  danger: "#B42318",
  "on-ink": "#FFFFFF",
  // 15: 배경 이미지(public/bg/background.webp)에서 가장 진한 픽셀(휘도 최소) — 실측값.
  // 이미지를 바꾸면 이 값과 아래 "배경 위" 쌍을 다시 계산할 것.
  "bg-darkest": "#EAE4DD",
  "bg-avg": "#FBF9F7",
  "ink-sub-bg": "#5E5E59",
  "line-on-bg": "#7A7A75",
};

function hexToRgb(hex) {
  const n = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
}

function relLuminance([r, g, b]) {
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [r, g, b].map(toLinear);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(hexA, hexB) {
  const la = relLuminance(hexToRgb(hexA));
  const lb = relLuminance(hexToRgb(hexB));
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/** @type {Array<{label: string, fg: string, bg: string, min: number, note?: string}>} */
const PAIRS = [
  { label: "ink on canvas (body text)", fg: "ink", bg: "canvas", min: 4.5 },
  { label: "ink on paper (card text)", fg: "ink", bg: "paper", min: 4.5 },
  { label: "ink on fill-weak (used card / weak button)", fg: "ink", bg: "fill-weak", min: 4.5 },
  { label: "ink-sub on canvas", fg: "ink-sub", bg: "canvas", min: 4.5 },
  { label: "ink-sub on paper", fg: "ink-sub", bg: "paper", min: 4.5 },
  { label: "ink-sub on fill-weak (used card)", fg: "ink-sub", bg: "fill-weak", min: 4.5 },
  { label: "on-ink on ink-soft (fill button)", fg: "on-ink", bg: "ink-soft", min: 4.5 },
  { label: "danger on paper (error text)", fg: "danger", bg: "paper", min: 4.5 },
  { label: "danger on canvas", fg: "danger", bg: "canvas", min: 4.5 },
  { label: "line-strong on paper (input border, UI)", fg: "line-strong", bg: "paper", min: 3 },
  { label: "line-strong on canvas (UI boundary)", fg: "line-strong", bg: "canvas", min: 3 },
  // 15: 배경 이미지 위에 **직접** 놓이는 요소 — 이미지의 가장 진한 픽셀 기준 최악값
  { label: "ink on bg-darkest (제목·구간 헤더·입장 라벨)", fg: "ink", bg: "bg-darkest", min: 4.5 },
  { label: "ink-sub on bg-darkest (15 이전 값 — 참고용, 미달이라 안 쓴다)", fg: "ink-sub", bg: "bg-darkest", min: 0, note: "예외: 배경 위에서는 ink-sub-bg로 대체했다(기록용)" },
  { label: "ink-sub-bg on bg-darkest (0/55·구간 범위·테이블 라벨·입장 예시·푸터)", fg: "ink-sub-bg", bg: "bg-darkest", min: 4.5 },
  { label: "ink-sub-bg on bg-avg (하단 바 면 backdrop)", fg: "ink-sub-bg", bg: "bg-avg", min: 4.5 },
  { label: "line-strong on bg-darkest (15 이전 값 — 참고용)", fg: "line-strong", bg: "bg-darkest", min: 0, note: "예외: 입장 밑줄은 line-on-bg로 대체했다(기록용)" },
  { label: "line-on-bg on bg-darkest (입장 화면 밑줄, UI)", fg: "line-on-bg", bg: "bg-darkest", min: 3 },
  { label: "danger on bg-darkest (오프라인 배너 글자)", fg: "danger", bg: "bg-darkest", min: 4.5 },
  {
    label: "hairline on paper (card/divider border)",
    fg: "hairline",
    bg: "paper",
    min: 3,
    note: "예외: 장식용 경계로 의도적으로 낮음 — 필요하면 #D8D8D3까지 허용",
  },
];

let failed = false;
const rows = PAIRS.map((pair) => {
  const ratio = contrastRatio(TOKENS[pair.fg], TOKENS[pair.bg]);
  const isException = pair.note?.startsWith("예외");
  const pass = isException ? true : ratio >= pair.min;
  if (!pass) failed = true;
  return { ...pair, ratio: ratio.toFixed(2), pass };
});

const nameWidth = Math.max(...rows.map((r) => r.label.length)) + 2;
console.log("대비 검증 — v3 팔레트 (WCAG 2.1)\n");
for (const r of rows) {
  const status = r.pass ? "PASS" : "FAIL";
  const noteStr = r.note ? `  (${r.note})` : "";
  console.log(`${r.label.padEnd(nameWidth)} ${r.ratio.padStart(6)}:1  최소 ${r.min}:1  [${status}]${noteStr}`);
}

if (failed) {
  console.error("\n대비 기준 미달 쌍이 있습니다.");
  process.exit(1);
} else {
  console.log("\n모든 쌍이 기준을 통과했습니다 (명시된 예외 제외).");
}
