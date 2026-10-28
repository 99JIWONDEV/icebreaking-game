"use client";

import type { ReactNode } from "react";

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-ink text-btn text-paper disabled:opacity-40"
      style={{ height: "var(--size-cta)", borderRadius: "var(--radius-cta)" }}
    >
      {children}
    </button>
  );
}
