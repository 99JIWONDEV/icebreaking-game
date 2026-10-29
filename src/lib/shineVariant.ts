"use client";

import { useSyncExternalStore } from "react";

// 07 후속 §1-3 — 카드 오픈 광택을 v1(복원한 Step 1/2 원본)/v4(새 "밝고 반짝이는" 방식)로
// /dev?shine=v1|v4 전환해 비교한다. cardVariant.ts와 같은 패턴. 기본값은 v4.
export type ShineVariant = "v1" | "v4";

const KEY = "icebreaker:shineVariant";
const listeners = new Set<() => void>();
let current: ShineVariant = readStored();

function readStored(): ShineVariant {
  if (typeof window === "undefined") return "v4";
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === "v1" ? "v1" : "v4";
  } catch {
    return "v4";
  }
}

export function getShineVariant(): ShineVariant {
  return current;
}

export function setShineVariant(variant: ShineVariant): void {
  if (variant === current) return;
  current = variant;
  try {
    window.localStorage.setItem(KEY, variant);
  } catch {
    // localStorage unavailable — 선택은 이번 세션(현재 탭)에만 유지된다
  }
  for (const listener of listeners) listener();
}

export function subscribeShineVariant(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useShineVariant(): ShineVariant {
  return useSyncExternalStore(subscribeShineVariant, getShineVariant, () => "v4");
}
