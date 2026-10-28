export const spring = {
  type: "spring",
  stiffness: 420,
  damping: 36,
  mass: 0.9,
} as const;

export const reducedMotionTransition = {
  type: "tween",
  duration: 0.12,
  ease: "linear",
} as const;

/** Shared-layout move for the card-open morph (grid tile → center). Motion's own
 *  MotionConfig docs use stiffness 200 / damping 22 as a shared-layout starting point. */
export const cardMoveSpring = {
  type: "spring",
  stiffness: 200,
  damping: 22,
} as const;

export const cardFlipTransition = {
  delay: 0.25,
  duration: 0.6,
  ease: "easeInOut",
} as const;

export const cardCloseFlipTransition = {
  duration: 0.52,
  ease: "easeInOut",
} as const;

export const textRevealDelayMs = 900;
export const textRevealStaggerMs = 90;

/** 카드가 자리를 잡는 시점(이동→뒤집기 직후)에 한 번 지나가는 대각선 스윕 — 디자인 v3 후속 §1a.
 *  흑백 톤(색 없음): OpenCardOverlay의 그라디언트 자체가 ink 5% 가장자리로 만든다. */
export const shineTransition = {
  delay: 0.85,
  duration: 0.7,
  ease: "easeOut",
} as const;
