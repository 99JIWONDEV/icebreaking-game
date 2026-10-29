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

/** 카드가 자리를 잡는 시점(이동→뒤집기 직후)에 한 번 지나가는 스윕 — 07 §1, 07 후속(단순화).
 *  v1은 Step 1/2 원본 타이밍(delay 0.85s, duration 0.9s, easeInOut — `git log -S
 *  shineTransition`로 찾은 c5c2fa4 커밋에서 확인)을 그대로 유지한다. */
export const shineV1Transition = {
  delay: 0.85,
  duration: 0.9,
  ease: "easeInOut",
} as const;

/** v4 — "한 번만, 천천히 지나가는 빛 하나"로 단순화(07 후속). delay(카드가 정착하는
 *  시점, 약 850ms)는 유지하고 duration만 1.6s로 늦췄다(프레임 캡처로 1.4~2.0s 범위
 *  확인, 밝기 곡선 국소 최대값 1개로 수렴). 띠·덮개·외곽 글로우가 전부 이 하나의
 *  transition을 공유한다 — 서로 다른 타이밍으로 따로 움직이던 게 "두 번 깜빡인다"는
 *  원인이었다(프레임 밝기 실측으로 확인: 글로우가 띠보다 100ms 먼저 시작해 봉우리가
 *  1135ms, 띠 자체의 봉우리와 어긋나 있었다). */
export const shineV4Transition = {
  delay: 0.85,
  duration: 1.6,
  ease: [0.45, 0, 0.25, 1],
} as const;
