"use client";

import { useSyncExternalStore } from "react";

// 상대 시간("3분 전") 표시용 — 렌더 중 Date.now()를 못 부르므로(React 19 purity 규칙)
// 모듈 전역 시계를 외부 스토어로 구독한다. 구독자가 있을 때만 30초마다 갱신.
let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot() {
  if (now === 0) now = Date.now(); // 첫 구독 전에도 안정된 값을 준다(clientId 훅과 같은 허용된 impure 스냅샷)
  return now;
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}

/** 짧은 한국어 상대 시간. 관리자 격자 칸이 좁아서 영어 병기는 하지 않는다. */
export function formatRelativeKo(timestamp: number, nowMs: number): string {
  const sec = Math.max(0, Math.floor((nowMs - timestamp) / 1000));
  if (sec < 60) return "방금";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${Math.floor(hour / 24)}일 전`;
}
