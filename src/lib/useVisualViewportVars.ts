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

/** 앱 루트에서 한 번만 호출한다(src/app/page.tsx) — `--vv-top`/`--vv-height`/`--layout-h`를
 *  <html>에 CSS 변수로, 키보드 열림 여부를 `data-keyboard`로 노출한다. 드로어/하단
 *  바가 이 값들을 기준으로 위치를 잡는다(10 §3, 11 §A).
 *
 *  11 §A: `--layout-h`(= `window.innerHeight`, 레이아웃 뷰포트 높이)도 같이 둔다 — iOS는
 *  키보드가 열려도 이 값을 안 줄인다. `visualViewport.height`(`--vv-height`)는 키보드
 *  **자동완성 막대까지** 가려서 실제보다 더 줄어든다 — 그 차이만큼 드로어 패널/scrim을
 *  `--vv-height`로만 맞추면 자동완성 막대 높이만큼 뒤 페이지가 비쳐 보인다(실기기에서
 *  발견). 패널/scrim은 `--layout-h`까지 늘리고, **스크롤되는 내용 영역만** `--vv-height`로
 *  제한한다. */
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
        root.style.setProperty("--layout-h", `${window.innerHeight}px`);
        root.dataset.keyboard = keyboard;
      });
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-height");
      root.style.removeProperty("--layout-h");
      delete root.dataset.keyboard;
    };
  }, []);
}
