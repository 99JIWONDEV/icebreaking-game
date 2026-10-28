"use client";

import { useSyncExternalStore } from "react";

// v3 §5 — 카드 프레임 변형 A(기본)/B를 /dev?card=a|b로 전환해 비교한다. localStorage에
// 저장해 /dev를 벗어나 메인 화면으로 돌아가도 선택이 유지된다(스크린샷 비교용).
export type CardVariant = "a" | "b";

const KEY = "icebreaker:cardVariant";
const listeners = new Set<() => void>();
let current: CardVariant = readStored();

function readStored(): CardVariant {
  if (typeof window === "undefined") return "a";
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === "b" ? "b" : "a";
  } catch {
    return "a";
  }
}

export function getCardVariant(): CardVariant {
  return current;
}

export function setCardVariant(variant: CardVariant): void {
  if (variant === current) return;
  current = variant;
  try {
    window.localStorage.setItem(KEY, variant);
  } catch {
    // localStorage unavailable — 선택은 이번 세션(현재 탭)에만 유지된다
  }
  for (const listener of listeners) listener();
}

export function subscribeCardVariant(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCardVariant(): CardVariant {
  return useSyncExternalStore(subscribeCardVariant, getCardVariant, () => "a");
}
