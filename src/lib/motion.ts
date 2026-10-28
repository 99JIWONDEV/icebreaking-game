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

export const shineTransition = {
  delay: 0.85,
  duration: 0.9,
  ease: "easeInOut",
} as const;

export const textRevealDelayMs = 900;
export const textRevealStaggerMs = 90;
