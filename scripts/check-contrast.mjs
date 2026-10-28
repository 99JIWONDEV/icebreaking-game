#!/usr/bin/env node
// WCAG 2.1 contrast checker for the "Harvest" palette (Step 3, Part A-8).
// Values below are kept in sync by hand with src/app/globals.css's @theme block —
// if you change a token there, update the matching constant here too.

/** @type {Record<string, string>} */
const TOKENS = {
  canvas: "#F7F0E3",
  paper: "#FFFDF8",
  ink: "#2B2118",
  "ink-sub": "#6B5E4E",
  hairline: "#E0D2B8",
  "line-strong": "#8F7F66",
  fill: "#EBE0CC",
  accent: "#A33F1C",
  "accent-ink": "#7F3216",
  "accent-weak": mixHex("#A33F1C", "#F7F0E3", 12), // color-mix(accent 12%, canvas)
  danger: "#B42318",
  "on-accent": "#FFFFFF",
  "outline-border": "#A09075",
  "cat-warmup": "#F2C497",
  "cat-me": "#EFDAA6",
  "cat-memories": "#CFD8B8",
  "cat-whatif": "#EBB8B2",
  "cat-faith": "#E0CDB0",
  "cat-together": "#F7E3C8",
};

function hexToRgb(hex) {
  const n = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
}

function mixHex(aHex, bHex, aPercent) {
  const a = hexToRgb(aHex);
  const b = hexToRgb(bHex);
  const t = aPercent / 100;
  const mixed = a.map((av, i) => Math.round(av * t + b[i] * (1 - t)));
  return "#" + mixed.map((v) => v.toString(16).padStart(2, "0")).join("");
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
  { label: "ink on paper (card front text)", fg: "ink", bg: "paper", min: 4.5 },
  { label: "ink-sub on canvas", fg: "ink-sub", bg: "canvas", min: 4.5 },
  { label: "ink-sub on paper", fg: "ink-sub", bg: "paper", min: 4.5 },
  { label: "on-accent on accent (fill button)", fg: "on-accent", bg: "accent", min: 4.5 },
  { label: "accent-ink on accent-weak (weak button)", fg: "accent-ink", bg: "accent-weak", min: 4.5 },
  { label: "danger on paper (error text)", fg: "danger", bg: "paper", min: 4.5 },
  { label: "danger on canvas", fg: "danger", bg: "canvas", min: 4.5 },
  { label: "ink on cat-warmup (card back number)", fg: "ink", bg: "cat-warmup", min: 4.5 },
  { label: "ink on cat-me", fg: "ink", bg: "cat-me", min: 4.5 },
  { label: "ink on cat-memories", fg: "ink", bg: "cat-memories", min: 4.5 },
  { label: "ink on cat-whatif", fg: "ink", bg: "cat-whatif", min: 4.5 },
  { label: "ink on cat-faith", fg: "ink", bg: "cat-faith", min: 4.5 },
  { label: "ink on cat-together", fg: "ink", bg: "cat-together", min: 4.5 },
  { label: "line-strong on paper (input border, UI)", fg: "line-strong", bg: "paper", min: 3 },
  { label: "line-strong on canvas (UI boundary)", fg: "line-strong", bg: "canvas", min: 3 },
  {
    label: "paper on canvas (card-background boundary)",
    fg: "paper",
    bg: "canvas",
    min: 3,
    note: "예외: 의도적으로 낮음(1.05~1.7:1) — 1px 테두리로 보완, DESIGN.md 참고",
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
console.log("대비 검증 — Harvest 팔레트 (WCAG 2.1)\n");
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
