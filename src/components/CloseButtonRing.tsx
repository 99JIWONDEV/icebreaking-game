"use client";

import { useEffect, useState } from "react";
import { MIN_OPEN_MS } from "@/lib/config";
import { closeCard, pick } from "@/lib/i18n";
import { useViewStore } from "@/store/useViewStore";

const SIZE = 20;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CloseButtonRing({
  openedAt,
  ready,
  onClose,
}: {
  openedAt: number;
  ready: boolean;
  onClose: () => void;
}) {
  const mode = useViewStore((state) => state.mode);
  // CloseButtonRing remounts fresh for every new card (keyed by cardId in the parent),
  // so starting unfilled and animating to full is correct without reading Date.now() here.
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(frame);
  }, [openedAt]);

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={onClose}
      className="relative flex w-full items-center justify-center gap-2 bg-paper text-btn text-ink"
      style={{
        height: "var(--size-cta)",
        borderRadius: "var(--radius-cta)",
        border: "1px solid var(--color-hairline)",
        opacity: ready ? 1 : 0.6,
      }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-hairline)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={filled ? 0 : CIRCUMFERENCE}
          style={{ transition: filled ? `stroke-dashoffset ${MIN_OPEN_MS}ms linear` : "none" }}
        />
      </svg>
      {pick(mode, closeCard.ko, closeCard.en)}
    </button>
  );
}
