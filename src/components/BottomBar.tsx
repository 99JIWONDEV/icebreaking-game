import type { ReactNode } from "react";

const ONE_BUTTON_HEIGHT = "var(--size-btn-lg)";
const BAR_VERTICAL_PADDING = "calc(0.75rem + 1.5rem + env(safe-area-inset-bottom))"; // top 12px + bottom 24px+safe
const EXTRA_CLEARANCE = "1.5rem"; // spec A-5: 바 높이 + 24px

/** Bottom padding a scroll area needs so its last row isn't hidden behind the bar. */
export function bottomBarClearance(buttonCount: 1 | 2 = 1): string {
  const buttons =
    buttonCount === 1 ? ONE_BUTTON_HEIGHT : `calc(${ONE_BUTTON_HEIGHT} * 2 + 0.75rem)`;
  return `calc(var(--size-cta-fade) + ${BAR_VERTICAL_PADDING} + ${buttons} + ${EXTRA_CLEARANCE})`;
}

/**
 * 고정 바 — 스펙 A-5: padding 12px 20px calc(24px + safe-area), 위에 canvas→투명
 * 페이드. 화면에 스크롤 가능한 콘텐츠가 있으면 bottomBarClearance()만큼 하단 패딩이
 * 필요하다.
 *
 * 10 §3-4: `bottom: 0` 대신 visualViewport 기준으로 위치를 잡는다 — iOS는 키보드가
 * 열려도 레이아웃 뷰포트(`bottom: 0`의 기준)를 안 줄이고 비주얼 뷰포트만 줄여서,
 * `bottom: 0`으로 두면 바가 키보드 뒤에 숨는다(숫자 키패드엔 완료 키가 없어서
 * 누를 방법이 없어진다). `top: vv-top + vv-height` + `translateY(-100%)`로 바의
 * **아래쪽 가장자리**를 비주얼 뷰포트 하단에 맞춘다 — 변수가 없으면(미지원 브라우저)
 * `0px + 100dvh`로 계산돼 기존 `bottom: 0`과 똑같이 동작한다. 키보드가 열리면
 * 아래 패딩도 12px로 줄어든다(`--cta-bottom-pad`, globals.css).
 */
export function BottomBar({ children, hidden }: { children: ReactNode; hidden?: boolean }) {
  // 카드가 열리면 OpenCardOverlay가 자기 자신의 CTA(카드 덮기)를 보여 주므로,
  // 이 바는 완전히 렌더링을 멈춘다 — 비활성 상태의 반투명 버튼과 겹쳐 보이는 문제를 피한다.
  if (hidden) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 mx-auto"
      style={{
        maxWidth: "var(--container-app)",
        top: "calc(var(--vv-top, 0px) + var(--vv-height, 100dvh))",
        transform: "translateY(-100%)",
      }}
    >
      <div aria-hidden className="cta-fade-mask" style={{ height: "var(--size-cta-fade)" }} />
      {/* v3 §2 "하단 바": 버튼은 전폭이 아니라 내용 폭(최소 160px)으로, 가운데 정렬 */}
      <div
        className="pointer-events-auto flex flex-col items-center bg-canvas"
        style={{ gap: "0.75rem", padding: "0.75rem 1.25rem var(--cta-bottom-pad)" }}
      >
        <div className="flex w-full flex-col items-center gap-3 [&>button]:min-w-[var(--size-btn-min)]">{children}</div>
      </div>
    </div>
  );
}
