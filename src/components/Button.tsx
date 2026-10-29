"use client";

import { forwardRef, type ReactNode } from "react";
import { motion } from "motion/react";

export type ButtonSize = "lg" | "md" | "sm";
export type ButtonVariant = "fill" | "weak" | "outline";

// v3: 세 크기 전부 radius 8px(--radius-btn) 공유, 폭은 전부 내용+패딩(auto) — 전폭 버튼 금지.
const SIZE: Record<ButtonSize, { height: string; paddingX: string; textClass: string }> = {
  lg: { height: "var(--size-btn-lg)", paddingX: "var(--size-btn-pad-lg)", textClass: "text-btn" },
  md: { height: "var(--size-btn-md)", paddingX: "var(--size-btn-pad-md)", textClass: "text-btn" },
  sm: { height: "var(--size-btn-sm)", paddingX: "var(--size-btn-pad-sm)", textClass: "text-label" },
};

// 09 §3: pressed 색은 variant마다 다르다 — fill은 스펙이 정확한 hex(#2B2B28)를 줘서
// 오버레이를 그 색으로 완전히 덮고(불투명도 1), weak/outline은 기존 검정 12% 오버레이를
// 그대로 쓴다(변경 요청 없음 — 특히 outline은 "테이블 변경" 버튼이 쓰고 있어 건드리면 안 된다).
const VARIANT: Record<
  ButtonVariant,
  { background: string; color: string; border: string; pressedOverlay: string; pressedOpacity: number }
> = {
  fill: {
    background: "var(--color-ink-soft)",
    color: "var(--color-on-ink)",
    border: "none",
    pressedOverlay: "var(--color-ink-soft-pressed)",
    pressedOpacity: 1,
  },
  weak: {
    background: "var(--color-fill-weak)",
    color: "var(--color-ink)",
    border: "none",
    pressedOverlay: "black",
    pressedOpacity: 0.12,
  },
  outline: {
    background: "transparent",
    color: "var(--color-ink)",
    border: "1px solid var(--color-line-strong)",
    pressedOverlay: "black",
    pressedOpacity: 0.12,
  },
};

export const Button = forwardRef<
  HTMLButtonElement,
  {
    children: ReactNode;
    onClick?: () => void;
    type?: "button" | "submit";
    size?: ButtonSize;
    variant?: ButtonVariant;
    disabled?: boolean;
    loading?: boolean;
    ariaLabel?: string;
  }
>(function Button(
  { children, onClick, type = "button", size = "lg", variant = "fill", disabled, loading, ariaLabel },
  ref,
) {
  const s = SIZE[size];
  const v = VARIANT[variant];
  const inert = disabled || loading;

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={inert}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      whileTap={!inert ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.12 }}
      // v3: 폭은 항상 내용+패딩(auto) — 전폭 버튼 금지, 두 줄로 꺾이지 않게 nowrap.
      // v4: lg도 40px로 줄며 44px 미만이 됐다 — 전부 투명 히트 영역으로 44px 이상 확보.
      className="relative inline-flex w-auto min-h-[var(--size-touch-min)] items-center justify-center whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      style={{ borderRadius: "var(--radius-btn)", opacity: disabled ? 0.4 : 1 }}
    >
      <span
        className={`relative flex items-center justify-center gap-1.5 overflow-hidden ${s.textClass}`}
        style={{
          height: s.height,
          borderRadius: "var(--radius-btn)",
          paddingInline: s.paddingX,
          background: v.background,
          color: v.color,
          border: v.border,
        }}
      >
        <motion.span
          aria-hidden
          tabIndex={-1}
          className="pointer-events-none absolute inset-0"
          style={{ background: v.pressedOverlay }}
          initial={{ opacity: 0 }}
          whileTap={!inert ? { opacity: v.pressedOpacity } : undefined}
          transition={{ duration: 0.12 }}
        />
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${loading ? "opacity-0" : ""}`}>{children}</span>
        {loading && <LoadingDots color={v.color} />}
      </span>
    </motion.button>
  );
});

function LoadingDots({ color }: { color: string }) {
  return (
    <span aria-hidden className="absolute inset-0 flex items-center justify-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-[5px] rounded-full"
          style={{ background: color }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
