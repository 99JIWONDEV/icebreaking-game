"use client";

import { useEffect } from "react";

// 10 §2: iOS WebKit은 키보드가 열려도 레이아웃 뷰포트(100dvh 등)는 그대로 두고
// visualViewport만 줄인다 — 이 차이(px)를 넘으면 키보드가 열린 것으로 본다.
const KEYBOARD_THRESHOLD_PX = 120;

export type ViewportVars = {
  vvTop: number;
  vvHeight: number;
  keyboard: "open" | "closed";
};

/** DOM 이펙트와 분리한 순수 계산 — 단위 테스트는 이 함수만 거친다(10 §4-2). */
export function computeViewportVars(offsetTop: number, height: number, innerHeight: number): ViewportVars {
  return {
    vvTop: offsetTop,
    vvHeight: height,
    keyboard: innerHeight - height > KEYBOARD_THRESHOLD_PX ? "open" : "closed",
  };
}

/** 앱 루트에서 한 번만 호출한다(src/app/page.tsx) — `--vv-top`/`--vv-height`를
 *  <html>에 CSS 변수로, 키보드 열림 여부를 `data-keyboard`로 노출한다. 드로어/하단
 *  바가 이 값들을 기준으로 위치를 잡는다(10 §3). */
export function useVisualViewportVars() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // 미지원 브라우저: CSS 기본값(100dvh)로 폴백
    const root = document.documentElement;
    let raf = 0;
    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { vvTop, vvHeight, keyboard } = computeViewportVars(vv.offsetTop, vv.height, window.innerHeight);
        root.style.setProperty("--vv-top", `${vvTop}px`);
        root.style.setProperty("--vv-height", `${vvHeight}px`);
        root.dataset.keyboard = keyboard;
      });
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-height");
      delete root.dataset.keyboard;
    };
  }, []);
}
