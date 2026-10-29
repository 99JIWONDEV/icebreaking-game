"use client";

import { useSyncExternalStore } from "react";

/**
 * 11 §B-3: 실기기에서 "카드가 두 번 반짝인다"의 원인이 shine 자체인지 가르기 위한
 * 임시 온디바이스 디버그 쿼리 — production에서도 동작한다. `/dev?shine=` 토글
 * (localStorage에 저장, `src/lib/shineVariant.ts`)과는 별개다: 이건 **저장하지 않고**
 * 매 페이지 로드마다 `location.search`만 읽는다. `?shine=off`면 광택 요소 자체를
 * 아예 렌더하지 않는다 — 그래도 두 번 깜빡이면 원인이 shine이 아니라는 뜻이다.
 * 원인이 확정되면 이 파일과 `OpenCardOverlay.tsx`의 호출부를 지운다.
 */
export type ShineQueryOverride = "off" | "v1" | "v4" | null;

function readShineQueryOverride(): ShineQueryOverride {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("shine");
  return v === "off" || v === "v1" || v === "v4" ? v : null;
}

function subscribe(): () => void {
  // 쿼리는 페이지 로드 시점에 한 번만 읽는다 — 이후 변화에 반응할 필요가 없다.
  return () => {};
}

export function useShineQueryOverride(): ShineQueryOverride {
  return useSyncExternalStore(subscribe, readShineQueryOverride, () => null);
}
