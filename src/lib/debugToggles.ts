"use client";

import { useSyncExternalStore } from "react";

/**
 * 12 §B-3: 카드를 열 때 빛이 두 번 반짝이는 원인을 실기기에서 이분 탐색으로 가르기
 * 위한 임시 온디바이스 토글 — production 포함 전 모드에서 동작하고 저장하지 않는다
 * (매 로드마다 쿼리만 읽음). 원인이 확정되면 이 파일과 `OpenCardOverlay.tsx`/
 * `DebugViewportOverlay.tsx`의 호출부를 지운다.
 *
 * - `?flip=fade`   : rotateY 3D 회전 대신 앞/뒤 면을 opacity 크로스페이드로 전환
 * - `?layout=off`  : layoutId 공유 레이아웃 애니메이션을 끄고 중앙에서 scale+fade로만 등장
 * - `?scrim=off`   : scrim 페이드를 끄고 즉시 표시
 * - `?shadow=off`  : 카드 box-shadow 전부 제거
 * - `?fix=ios`     : 표준 iOS 합성 안정화 묶음(아래 OpenCardOverlay.tsx 참고)
 *
 * 조합 가능(`?flip=fade&scrim=off`).
 */
export type DebugToggles = {
  flipFade: boolean;
  layoutOff: boolean;
  scrimOff: boolean;
  shadowOff: boolean;
  fixIos: boolean;
};

const DEFAULT_TOGGLES: DebugToggles = {
  flipFade: false,
  layoutOff: false,
  scrimOff: false,
  shadowOff: false,
  fixIos: false,
};

// useSyncExternalStore는 getSnapshot이 매번 같은 참조를 돌려줘야 한다(안 그러면
// "변했다"고 보고 다시 렌더 → 다시 getSnapshot 호출 → 또 새 객체... 무한 루프,
// "Maximum update depth exceeded"로 실제로 터졌다). location.search가 바뀌지 않는
// 한(이 쿼리는 세션 내내 안 바뀐다) 캐시된 같은 객체를 반환한다.
let cached: DebugToggles | null = null;
let cachedSearch: string | null = null;

function readDebugToggles(): DebugToggles {
  if (typeof window === "undefined") return DEFAULT_TOGGLES;
  const search = window.location.search;
  if (cached && cachedSearch === search) return cached;
  const qs = new URLSearchParams(search);
  cached = {
    flipFade: qs.get("flip") === "fade",
    layoutOff: qs.get("layout") === "off",
    scrimOff: qs.get("scrim") === "off",
    shadowOff: qs.get("shadow") === "off",
    fixIos: qs.get("fix") === "ios",
  };
  cachedSearch = search;
  return cached;
}

function subscribe(): () => void {
  // 쿼리는 페이지 로드 시점에 한 번만 읽는다 — 이후 변화에 반응할 필요가 없다.
  return () => {};
}

export function useDebugToggles(): DebugToggles {
  return useSyncExternalStore(subscribe, readDebugToggles, () => DEFAULT_TOGGLES);
}

/** DebugViewportOverlay(?debug=vv)에 "현재 켜진 토글"을 표시하기 위한 요약 문자열. */
export function debugTogglesSummary(): string {
  const t = readDebugToggles();
  const active = (Object.keys(t) as (keyof DebugToggles)[]).filter((k) => t[k]);
  return active.length ? active.join(", ") : "(none)";
}
