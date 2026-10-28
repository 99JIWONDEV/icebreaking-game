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

/** 카드가 자리를 잡는 시점(이동→뒤집기 직후)에 한 번 지나가는 대각선 스윕 — 디자인 v3 후속 §1a/§3.
 *  Step 1/2 원본 값 그대로 복원했다(git show c5c2fa4:src/lib/motion.ts — delay/duration/ease
 *  전부 동일, 한 번도 바뀐 적 없었다). 당시 카드 면은 `#FAF6EE`(크림색)라 흰 35% 그라디언트가
 *  보였지만, 지금은 `#FFFFFF`라 색만 OpenCardOverlay에서 ink 톤으로 바꿨다 — 기하(각도/폭/
 *  타이밍)는 원본 그대로. */
export const shineTransition = {
  delay: 0.85,
  duration: 0.9,
  ease: "easeInOut",
} as const;
