"use client";

import type { CSSProperties } from "react";
import { motion } from "motion/react";
import { shineGlintDurationMs, shineGlowTransition, shineV1Transition, shineV4Transition } from "@/lib/motion";

// 07 §1-2: 카드 비율(3:4.2)의 대각선 각도 — 정확한 45°가 아니어도 된다는 스펙 허용대로 근사치를 쓴다.
// atan(4.2/3) ≈ 54.5deg가 이동 방향(왼쪽 위 → 오른쪽 아래), 띠 자체는 그와 직각(−35.5deg,
// 왼쪽 아래 → 오른쪽 위로 뻗은 사선)으로 눕힌다.
const TRAVEL_ANGLE_DEG = 54.5;
const BAND_ANGLE_DEG = TRAVEL_ANGLE_DEG - 90;

/** v1 — Step 1/2 원본 기하(100deg, 폭 1/3, 수평 이동) 그대로 복원. 색만 지금 카드 면(#FFFFFF)에
 *  맞춰 ink 톤으로 바꿨다(원본 흰 35%는 흰 카드 위에서 원리상 안 보인다). */
export function CardShineV1() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 w-1/3"
      style={{
        background:
          "linear-gradient(100deg, transparent, color-mix(in srgb, var(--color-ink) 7%, transparent), transparent)",
      }}
      initial={{ left: "-40%" }}
      animate={{ left: "110%" }}
      transition={shineV1Transition}
    />
  );
}

/**
 * v4 — 왼쪽 위 → 오른쪽 아래 대각선 스윕. overflow-hidden 안(카드 면 위)에 둔다.
 * (a) 와이프: 띠 바로 앞(진행 방향)만 옅게 덮고 지나간 자리는 그라디언트 soft edge로 드러난다.
 * (b) 밝은 띠: 중앙 0.95(선두 가장자리는 1.0) 흰색, 가장자리는 그라디언트로 0까지 부드럽게.
 * 둘 다 바깥쪽 wrapper(카드와 같은 크기, 100%)의 x/y만 애니메이션하고, 안쪽 사각형은 고정된
 * transform(rotate)만 쓴다 — transform/opacity만 쓰라는 스펙 그대로.
 */
export function CardShineV4Sweep() {
  // 320% 크기의 회전된 사각형을 완전히 치우려면 중심 간 거리가 대략 (사각형 반대각선 155% +
  // 카드 반대각선 86%) ≈ 241% 이상 벌어져야 한다 — 처음 범위(±140%/±190%, 거리 236)는
  // 근소하게 부족해서 오른쪽 아래 구석에 옅은 덮개가 남았다(스크린샷으로 발견). 여유를 두고 늘렸다.
  const sharedAnimate = { initial: { x: "-170%", y: "-220%" }, animate: { x: "170%", y: "220%" }, transition: shineV4Transition };
  return (
    <>
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" {...sharedAnimate}>
        <div
          style={{
            position: "absolute",
            left: "-110%",
            top: "-110%",
            width: "320%",
            height: "320%",
            transform: `rotate(${BAND_ANGLE_DEG}deg)`,
            // "to top": 띠 뒤쪽(이미 지나간 왼쪽 위)은 투명, 앞쪽(아직 안 지나간 오른쪽 아래)은
            // 어둡게 — 실측해 보니 처음엔 반대(오른쪽 아래가 먼저 맑아짐)였다, 방향을 뒤집었다.
            background: "linear-gradient(to top, transparent 0%, rgb(23 23 23 / 0.06) 16%, rgb(23 23 23 / 0.06) 100%)",
          }}
        />
      </motion.div>
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" {...sharedAnimate}>
        <div
          style={{
            position: "absolute",
            left: "-110%",
            top: "-110%",
            width: "320%",
            height: "320%",
            transform: `rotate(${BAND_ANGLE_DEG}deg)`,
            background:
              "linear-gradient(to bottom, transparent 42%, rgb(255 255 255 / 0.95) 49%, rgb(255 255 255 / 1) 50.5%, rgb(255 255 255 / 0.95) 52%, transparent 59%)",
          }}
        />
      </motion.div>
    </>
  );
}

/** (c) 외곽 글로우 — overflow-hidden 바깥(카드 뒤집기 컨테이너의 형제)에 둔다. box-shadow 자체는
 *  고정값이고 opacity만 애니메이션한다(box-shadow를 직접 움직이면 비싸다). */
export function CardShineV4Glow() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
        borderRadius: "var(--radius-card)",
        boxShadow: "0 0 48px 24px rgb(255 255 255 / 0.5)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={shineGlowTransition}
    />
  );
}

const STAR_PATH = "M12 0 L14.3 9.7 L24 12 L14.3 14.3 L12 24 L9.7 14.3 L0 12 L9.7 9.7 Z";

function Glint({
  style,
  size,
  delaySec,
}: {
  style: CSSProperties;
  size: number;
  delaySec: number;
}) {
  return (
    <motion.svg
      aria-hidden
      className="pointer-events-none absolute"
      style={{ ...style, width: size, height: size, filter: "drop-shadow(0 0 6px rgb(255 255 255 / 0.9))" }}
      viewBox="0 0 24 24"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
      transition={{ delay: delaySec, duration: shineGlintDurationMs / 1000, ease: "easeInOut" }}
    >
      <path d={STAR_PATH} fill="white" />
    </motion.svg>
  );
}

/** (d) 모서리/가장자리 글린트 — 카드 바깥쪽에 반쯤 걸치게 둬서 scrim 위에서 보이게 한다.
 *  overflow-hidden 바깥(글로우와 같은 레이어)에 둔다. */
export function CardShineV4Glints() {
  const delay = shineV4Transition.delay;
  const duration = shineV4Transition.duration;
  return (
    <>
      <Glint style={{ top: "-10px", left: "-10px" }} size={22} delaySec={delay} />
      <Glint style={{ top: `${25 - 6}%`, left: `${25 - 6}%` }} size={10} delaySec={delay + duration * 0.25} />
      <Glint style={{ top: `${50 - 6}%`, left: `${50 - 6}%` }} size={11} delaySec={delay + duration * 0.5} />
      <Glint style={{ top: `${75 - 6}%`, left: `${75 - 6}%` }} size={10} delaySec={delay + duration * 0.75} />
      <Glint style={{ bottom: "-10px", right: "-10px" }} size={22} delaySec={delay + duration} />
    </>
  );
}
