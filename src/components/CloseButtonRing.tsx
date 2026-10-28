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
    // v3 §2 "하단 바" 규칙(내용 폭, 최소 폭 160px)을 열린 카드의 덮기 버튼도 따른다
    <div className="flex justify-center [&>button]:min-w-[var(--size-btn-min)]">
      <Button type="button" size="lg" variant="fill" disabled={!ready} onClick={onClose}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="color-mix(in srgb, var(--color-on-ink) 35%, transparent)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-on-ink)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={filled ? 0 : CIRCUMFERENCE}
            style={{ transition: filled ? `stroke-dashoffset ${MIN_OPEN_MS}ms linear` : "none" }}
          />
        </svg>
        {pick(mode, closeCard.ko, closeCard.en)}
      </Button>
    </div>
  );
}
