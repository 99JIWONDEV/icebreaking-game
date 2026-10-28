"use client";

import type { CSSProperties } from "react";
import { useCardVariant } from "@/lib/cardVariant";
import { questionIndex, type Question } from "@/lib/questions";

const TICK_CORNERS: Array<{ key: string; style: CSSProperties }> = [
  { key: "tl", style: { top: "var(--size-card-frame-inset)", left: "var(--size-card-frame-inset)", borderTop: "1px solid var(--color-line-strong)", borderLeft: "1px solid var(--color-line-strong)" } },
  { key: "tr", style: { top: "var(--size-card-frame-inset)", right: "var(--size-card-frame-inset)", borderTop: "1px solid var(--color-line-strong)", borderRight: "1px solid var(--color-line-strong)" } },
  { key: "bl", style: { bottom: "var(--size-card-frame-inset)", left: "var(--size-card-frame-inset)", borderBottom: "1px solid var(--color-line-strong)", borderLeft: "1px solid var(--color-line-strong)" } },
  { key: "br", style: { bottom: "var(--size-card-frame-inset)", right: "var(--size-card-frame-inset)", borderBottom: "1px solid var(--color-line-strong)", borderRight: "1px solid var(--color-line-strong)" } },
];

/** 변형 A(기본) — 안쪽 프레임 + "No." 라벨 + 번호 + 짧은 가로선. 스펙 §5. */
function FrameA({ compact, numberClass, numberColorClass, label }: { compact: boolean; numberClass: string; numberColorClass: string; label: string }) {
  return (
    <div
      className="absolute flex flex-col items-center justify-center"
      style={{
        inset: "var(--size-card-frame-inset)",
        borderRadius: "var(--radius-card-inner)",
        border: "1px solid var(--color-hairline)",
      }}
    >
      {!compact && (
        <span className="text-label text-ink-sub" style={{ letterSpacing: "0.04em" }}>
          No.
        </span>
      )}
      <span className={`font-sans ${numberColorClass} ${numberClass}`} style={{ fontVariantNumeric: "tabular-nums", marginTop: compact ? 0 : "0.25rem" }}>
        {label}
      </span>
      <span
        aria-hidden
        style={{ width: "var(--size-card-line)", height: "1px", background: "var(--color-line-strong)", marginTop: "var(--size-card-number-gap)" }}
      />
    </div>
  );
}

/** 변형 B(비교용) — 모서리 L자 틱만, 라벨/가로선 없음. 스펙 §5. */
function TicksB({ numberClass, numberColorClass, label }: { numberClass: string; numberColorClass: string; label: string }) {
  return (
    <>
      {TICK_CORNERS.map((c) => (
        <span key={c.key} aria-hidden className="absolute" style={{ width: "var(--size-card-tick)", height: "var(--size-card-tick)", ...c.style }} />
      ))}
      <span className={`font-sans ${numberColorClass} ${numberClass}`} style={{ fontVariantNumeric: "tabular-nums" }}>
        {label}
      </span>
    </>
  );
}

function UsedCheck() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="absolute"
      style={{ top: "var(--size-card-frame-inset)", right: "var(--size-card-frame-inset)" }}
    >
      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="var(--color-ink-sub)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CardBackFace({
  question,
  used,
  compact = false,
}: {
  question: Question;
  used: boolean;
  /** "전체" 구간 보기처럼 카드가 작을 때 — No. 라벨을 숨기고 번호만 축소한다(변형 A, 스펙 §5). */
  compact?: boolean;
}) {
  const variant = useCardVariant();
  const label = String(questionIndex(question)).padStart(2, "0");
  const numberClass = compact ? "text-card-number-sm" : "text-card-number";
  const numberColorClass = used ? "text-ink-sub" : "text-ink";

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center ${used ? "bg-fill-weak" : "bg-paper"}`}
      style={{ borderRadius: "var(--radius-track)", border: "1px solid var(--color-hairline)" }}
    >
      {used && <UsedCheck />}
      {variant === "a" ? (
        <FrameA compact={compact} numberClass={numberClass} numberColorClass={numberColorClass} label={label} />
      ) : (
        <TicksB numberClass={numberClass} numberColorClass={numberColorClass} label={label} />
      )}
    </div>
  );
}
