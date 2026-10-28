"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

export type ButtonSize = "xl" | "lg" | "md" | "sm";
export type ButtonVariant = "fill" | "weak" | "outline";

const SIZE: Record<ButtonSize, { height: string; radius: string; paddingX: string; textClass: string }> = {
  xl: { height: "var(--size-btn-xl)", radius: "var(--radius-btn-xl)", paddingX: "1.25rem", textClass: "text-btn-xl" },
  lg: { height: "var(--size-btn-lg)", radius: "var(--radius-btn-lg)", paddingX: "1.25rem", textClass: "text-btn-lg" },
  md: { height: "var(--size-btn-md)", radius: "var(--radius-btn-md)", paddingX: "1rem", textClass: "text-btn-md" },
  sm: { height: "var(--size-btn-sm)", radius: "var(--radius-btn-sm)", paddingX: "0.75rem", textClass: "text-label" },
};

const VARIANT: Record<ButtonVariant, { background: string; color: string; border: string }> = {
  fill: { background: "var(--color-accent)", color: "var(--color-on-accent)", border: "none" },
  weak: { background: "var(--color-accent-weak)", color: "var(--color-accent-ink)", border: "none" },
  outline: { background: "transparent", color: "var(--color-ink)", border: "1px solid var(--color-outline-border)" },
};

export function Button({
  children,
  onClick,
  type = "button",
  size = "lg",
  variant = "fill",
  display,
  disabled,
  loading,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  size?: ButtonSize;
  variant?: ButtonVariant;
  display?: "full";
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
}) {
  const s = SIZE[size];
  const v = VARIANT[variant];
  const inert = disabled || loading;
  const expandHitArea = size === "sm" || size === "md";

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={inert}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      whileTap={!inert ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.12 }}
      className={`relative inline-flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
        display === "full" ? "w-full" : ""
      } ${expandHitArea ? "min-h-[var(--size-touch-min)]" : ""}`}
      style={{ borderRadius: s.radius, opacity: disabled ? 0.4 : 1 }}
    >
      <span
        className={`relative flex w-full items-center justify-center gap-1.5 overflow-hidden ${s.textClass}`}
        style={{
          height: s.height,
          borderRadius: s.radius,
          paddingInline: s.paddingX,
          background: v.background,
          color: v.color,
          border: v.border,
        }}
      >
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black"
          initial={{ opacity: 0 }}
          whileTap={!inert ? { opacity: 0.12 } : undefined}
          transition={{ duration: 0.12 }}
        />
        <span className={`inline-flex items-center gap-1.5 ${loading ? "opacity-0" : ""}`}>{children}</span>
        {loading && <LoadingDots color={v.color} />}
      </span>
    </motion.button>
  );
}

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
