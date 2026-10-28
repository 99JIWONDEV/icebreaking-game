"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
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
    <Button type="button" size="xl" variant="fill" display="full" disabled={!ready} onClick={onClose}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="color-mix(in srgb, var(--color-on-accent) 35%, transparent)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-on-accent)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={filled ? 0 : CIRCUMFERENCE}
          style={{ transition: filled ? `stroke-dashoffset ${MIN_OPEN_MS}ms linear` : "none" }}
        />
      </svg>
      {pick(mode, closeCard.ko, closeCard.en)}
    </Button>
  );
}
