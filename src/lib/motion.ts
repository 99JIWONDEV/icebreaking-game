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

/** 카드가 자리를 잡는 시점(이동→뒤집기 직후)에 한 번 지나가는 스윕 — 07 §1. 두 버전이
 *  이 타이밍(delay 0.85s, duration 0.9s — Step 1/2 원본, 한 번도 바뀐 적 없었다. `git log
 *  -S shineTransition`로 찾은 c5c2fa4 커밋에서 확인)을 공유한다. v1은 원본 easing(easeInOut)
 *  그대로, v4는 07 §1-2가 지정한 cubic-bezier(.4,0,.2,1)만 다르다. */
export const shineV1Transition = {
  delay: 0.85,
  duration: 0.9,
  ease: "easeInOut",
} as const;

export const shineV4Transition = {
  delay: 0.85,
  duration: 0.9,
  ease: [0.4, 0, 0.2, 1],
} as const;

/** v4 전용 — 외곽 글로우 fade in/out과 모서리 글린트 깜빡임 타이밍(07 §1-2 c, d).
 *  `times`는 motion의 Transition 타입이 mutable number[]를 요구해 `as const`를 안 쓴다. */
export const shineGlowTransition = {
  delay: 0.75,
  duration: 1.1,
  times: [0, 0.35, 1] as number[],
  ease: "easeInOut" as const,
};

export const shineGlintDurationMs = 300;
