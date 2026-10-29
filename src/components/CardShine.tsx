"use client";

import { motion } from "motion/react";
import { shineV1Transition, shineV4Transition } from "@/lib/motion";

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
 * v4 — 왼쪽 위 → 오른쪽 아래, 한 번만 지나가는 넓고 부드러운 빛 하나(07 후속 단순화).
 * overflow-hidden 안(카드 면 위)에 둔다. 와이프(덮개)와 밝은 띠는 같은 `shineV4Transition`
 * (바깥쪽 wrapper의 x/y)을 공유해 항상 같은 타이밍으로 함께 움직인다 — 둘이 따로 깜빡이지
 *않는다. 안쪽 사각형은 고정된 transform(rotate)만 쓴다 — transform/opacity만 쓰라는 스펙 그대로.
 */
export function CardShineV4Sweep() {
  // 320% 크기의 회전된 사각형을 완전히 치우려면 중심 간 거리가 대략 (사각형 반대각선 155% +
  // 카드 반대각선 86%) ≈ 241% 이상 벌어져야 한다 — 여유를 두고 ±170%/±220%로 둔다.
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
            // 띠 바로 앞뒤에서만 살짝 어두웠다가 밝아지는 좁은 그늘로 바꿨다(07 후속). 원래는
            // 박스 전체의 84%(16~100%)를 어둡게 칠했는데, duration이 1.6s로 느려지면서 띠가
            // 지나간 뒤에도 한참 어두운 구간이 남아 "밝아짐→다시 어두워짐" 이중 굴곡을 만들었다
            // (프레임 밝기 실측으로 확인). 이제 띠(41.5~58.5%)를 감싸는 폭으로만 어둡게 한다.
            background:
              "linear-gradient(to top, transparent 36%, rgb(23 23 23 / 0.05) 42%, rgb(23 23 23 / 0.05) 58%, transparent 64%)",
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
            // 폭 ~17%(카드 대각선의 약 45%에 해당 — 320%로 과대 확대된 이 사각형의 전체
            // 그라디언트 길이 기준). 5-stop으로 가우시안처럼 서서히 올라갔다 내려가는 곡선
            // (가장자리 0 → 0.35 → 중앙 0.92 → 0.35 → 0, 중앙이 거의 불투명). 날카로운
            // 가장자리 없이 전부 부드러운 falloff만 쓴다.
            background:
              "linear-gradient(to bottom, " +
              "transparent 41.5%, " +
              "rgb(255 255 255 / 0.35) 45.75%, " +
              "rgb(255 255 255 / 0.92) 50%, " +
              "rgb(255 255 255 / 0.35) 54.25%, " +
              "transparent 58.5%)",
          }}
        />
      </motion.div>
    </>
  );
}

/** (c) 외곽 글로우 — overflow-hidden 바깥(카드 뒤집기 컨테이너의 형제)에 둔다. box-shadow 자체는
 *  고정값이고 opacity만 애니메이션한다(box-shadow를 직접 움직이면 비싸다). 띠와 **같은**
 *  `shineV4Transition`을 그대로 써서 올라갔다(가운데) 내려가는 단조 곡선 하나로만 움직인다 —
 *  예전엔 글로우가 띠보다 100ms 먼저 시작하는 별도 타이밍(delay 0.75s/duration 1.1s)을 써서
 *  봉우리가 띠 자체의 봉우리와 어긋나 있었고, 이게 프레임 밝기 실측으로 확인한 "두 번
 *  깜빡인다"의 원인이었다. */
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
      animate={{ opacity: [0, 0.9, 0] }}
      transition={shineV4Transition}
    />
  );
}
