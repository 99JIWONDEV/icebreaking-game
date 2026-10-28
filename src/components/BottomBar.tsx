import type { ReactNode } from "react";

const ONE_BUTTON_HEIGHT = "var(--size-btn-xl)";
const BAR_VERTICAL_PADDING = "calc(0.75rem + 1.5rem + env(safe-area-inset-bottom))"; // top 12px + bottom 24px+safe
const EXTRA_CLEARANCE = "1.5rem"; // spec A-5: 바 높이 + 24px

/** Bottom padding a scroll area needs so its last row isn't hidden behind the bar. */
export function bottomBarClearance(buttonCount: 1 | 2 = 1): string {
  const buttons =
    buttonCount === 1 ? ONE_BUTTON_HEIGHT : `calc(${ONE_BUTTON_HEIGHT} * 2 + 0.75rem)`;
  return `calc(var(--size-cta-fade) + ${BAR_VERTICAL_PADDING} + ${buttons} + ${EXTRA_CLEARANCE})`;
}

/**
 * Fixed bottom CTA bar — spec A-5: padding 12px 20px calc(24px + safe-area),
 * with a canvas→transparent fade above it so the grid doesn't end abruptly.
 * Screens with scrollable content behind the bar need matching bottom padding;
 * see BOTTOM_BAR_CLEARANCE.
 */
export function BottomBar({ children, hidden }: { children: ReactNode; hidden?: boolean }) {
  // 카드가 열리면 OpenCardOverlay가 자기 자신의 CTA(카드 덮기)를 보여 주므로,
  // 이 바는 완전히 렌더링을 멈춘다 — 비활성 상태의 반투명 버튼과 겹쳐 보이는 문제를 피한다.
  if (hidden) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto" style={{ maxWidth: "var(--container-app)" }}>
      <div aria-hidden className="cta-fade-mask" style={{ height: "var(--size-cta-fade)" }} />
      <div
        className="pointer-events-auto flex flex-col bg-canvas"
        style={{ gap: "0.75rem", padding: "0.75rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        {children}
      </div>
    </div>
  );
}
