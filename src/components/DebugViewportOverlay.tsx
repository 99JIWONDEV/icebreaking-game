"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { debugTogglesSummary } from "@/lib/debugToggles";

/**
 * 12 §A-2: 실기기(iPhone)에서 visualViewport/레이아웃 뷰포트 실시간 값을 직접 보기
 * 위한 임시 디버그 오버레이 — `/?debug=vv`로 연다. production 포함 전 모드에서
 * 동작하고 저장은 하지 않는다(쿼리만 읽음). 원인이 확정되면 이 파일과 호출부(page.tsx)
 * 를 지운다.
 */
function isDebugVvOn(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "vv";
}

function subscribe(): () => void {
  return () => {};
}

function readSnapshot(): Record<string, string> {
  const vv = window.visualViewport;
  const root = document.documentElement;
  const rootStyle = getComputedStyle(root);
  // MenuDrawer.tsx의 클래스 이름과 짝 — 드로어가 열려 있을 때만 존재한다.
  const scrim = document.querySelector(".bg-scrim");
  const panel = document.querySelector(".fixed.left-0.z-50");
  const rectStr = (el: Element | null) => {
    if (!el) return "(none)";
    const r = el.getBoundingClientRect();
    return `${r.top.toFixed(0)}~${r.bottom.toFixed(0)}`;
  };
  return {
    innerHeight: String(window.innerHeight),
    innerWidth: String(window.innerWidth),
    "vv.height": vv ? vv.height.toFixed(1) : "(no vv)",
    "vv.width": vv ? vv.width.toFixed(1) : "(no vv)",
    "vv.offsetTop": vv ? vv.offsetTop.toFixed(1) : "(no vv)",
    "vv.pageTop": vv ? vv.pageTop.toFixed(1) : "(no vv)",
    "vv.scale": vv ? vv.scale.toFixed(2) : "(no vv)",
    clientHeight: String(root.clientHeight),
    activeElement: document.activeElement?.tagName ?? "null",
    "data-keyboard": root.dataset.keyboard ?? "(unset)",
    "--vv-top": rootStyle.getPropertyValue("--vv-top") || "(unset)",
    "--vv-height": rootStyle.getPropertyValue("--vv-height") || "(unset)",
    "--layout-h": rootStyle.getPropertyValue("--layout-h") || "(unset)",
    scrollY: String(window.scrollY),
    "scrim top~bottom": rectStr(scrim),
    "panel top~bottom": rectStr(panel),
    toggles: debugTogglesSummary(),
  };
}

export function DebugViewportOverlay() {
  // 서버는 window가 없어 항상 false를 렌더한다 — 클라이언트 첫 렌더(hydration 전)도
  // 똑같이 false로 맞춰야 한다. useState(isDebugVvOn)은 초기화 함수를 클라이언트
  // 첫 렌더에서 즉시 평가해 버려서(window가 있으니 바로 true일 수 있음) 서버 렌더와
  // 어긋나 hydration mismatch가 났다 — useSyncExternalStore의 getServerSnapshot으로
  // 고친다(shineQueryOverride.ts/debugToggles.ts와 같은 패턴).
  const on = useSyncExternalStore(subscribe, isDebugVvOn, () => false);
  const [snapshot, setSnapshot] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!on) return;
    const tick = () => setSnapshot(readSnapshot());
    tick();
    const id = setInterval(tick, 100); // 1초에 여러 번(10회) 갱신
    return () => clearInterval(id);
  }, [on]);

  if (!on) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: "var(--vv-top, 0px)",
        left: 0,
        zIndex: 2147483647,
        pointerEvents: "none",
        fontFamily: "ui-monospace, monospace",
        fontSize: "11px",
        lineHeight: 1.4,
        background: "rgba(0, 0, 0, 0.8)",
        color: "#fff",
        padding: "4px 6px",
        whiteSpace: "pre",
      }}
    >
      {Object.entries(snapshot)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")}
    </div>
  );
}
