"use client";

import { useSyncExternalStore } from "react";

// 07 후속 §1-3 — 카드 오픈 광택을 off/v1(복원한 Step 1/2 원본)/v4(새 "밝고 반짝이는"
// 방식)로 /dev?shine=off|v1|v4 전환해 비교한다. cardVariant.ts와 같은 패턴.
// 14 §B: 기본값을 v4 → off로 바꿨다 — 실기기(iPhone)에서 `?shine=off`로 열었을 때만
// 깜빡임이 완전히 사라지는 게 확인돼(두 번 깜빡임의 실제 원인이 shine이었다), 원인을
// 더 고치기 전까지는 기본으로 꺼 둔다. 코드는 지우지 않고 `?shine=v1|v4`(저장 안 함,
// shineQueryOverride.ts)나 `/dev?shine=v1|v4`(저장함, 아래)로 계속 켤 수 있다.
export type ShineVariant = "off" | "v1" | "v4";

const KEY = "icebreaker:shineVariant";
const listeners = new Set<() => void>();
let current: ShineVariant = readStored();

function readStored(): ShineVariant {
  if (typeof window === "undefined") return "off";
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === "v1" || stored === "v4" ? stored : "off";
  } catch {
    return "off";
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
  return useSyncExternalStore(subscribeShineVariant, getShineVariant, () => "off");
}
