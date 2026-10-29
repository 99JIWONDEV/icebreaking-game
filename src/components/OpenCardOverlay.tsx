"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { CardBackFace } from "@/components/CardBackFace";
import { CardShineV1, CardShineV4Glow, CardShineV4Sweep } from "@/components/CardShine";
import { CloseButtonRing } from "@/components/CloseButtonRing";
import { QuestionCard } from "@/components/QuestionCard";
import { MIN_OPEN_MS } from "@/lib/config";
import { useDebugToggles } from "@/lib/debugToggles";
import { cardCloseFlipTransition, cardFlipTransition, cardMoveSpring, shineV1Transition, shineV4Transition, textRevealDelayMs } from "@/lib/motion";
import { questionIndex, type Question } from "@/lib/questions";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useShineQueryOverride } from "@/lib/shineQueryOverride";
import { useShineVariant } from "@/lib/shineVariant";

export function OpenCardOverlay({
  question,
  openedAt,
  animate,
  onClose,
}: {
  question: Question;
  openedAt: number;
  /** false for a card that was already open when this device connected — spec §5-1 재접속 규칙 */
  animate: boolean;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const playIntro = animate && !reduced;
  // 12 §B-3: 실기기 이분 탐색용 임시 토글 — ?flip=fade|?layout=off|?scrim=off|
  // ?shadow=off|?fix=ios. 원인이 확정되면 debugToggles.ts와 이 호출부를 지운다.
  const toggles = useDebugToggles();
  const storedShineVariant = useShineVariant();
  // 11 §B-3: ?shine=off|v1|v4가 있으면 저장된(/dev) 선택보다 우선한다 — 저장하지 않고
  // 이번 로드에만 적용된다.
  const shineQueryOverride = useShineQueryOverride();
  const shineVariant = shineQueryOverride === "v1" || shineQueryOverride === "v4" ? shineQueryOverride : storedShineVariant;
  const shineOff = shineQueryOverride === "off";
  const [textRevealed, setTextRevealed] = useState(!playIntro);
  const [ready, setReady] = useState(false);
  const [shineDone, setShineDone] = useState(!playIntro);
  const titleId = useId();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const number = questionIndex(question);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();
    return () => {
      // 캡처해 둔 노드가 그 사이 리렌더로 교체됐을 수 있으니, 같은 카드의 격자 버튼을
      // data-card-id로 다시 찾아 포커스한다 — 실패하면 캡처해 둔 참조로 대체한다.
      const freshTile = document.querySelector<HTMLElement>(`[data-card-id="${question.id}"]`);
      (freshTile ?? previousFocusRef.current)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playIntro) return;
    const t = setTimeout(() => setTextRevealed(true), textRevealDelayMs);
    return () => clearTimeout(t);
  }, [playIntro]);

  // 07 §1-2: 광택 효과는 끝나면 DOM에서 제거한다 — 끝나는 시점은 버전별 transition에서 계산한다.
  useEffect(() => {
    if (!playIntro) return;
    const t = shineVariant === "v1" ? shineV1Transition : shineV4Transition;
    const ms = (t.delay + t.duration) * 1000 + 50; // 애니메이션 꼬리까지 여유 50ms
    const timer = setTimeout(() => setShineDone(true), ms);
    return () => clearTimeout(timer);
  }, [playIntro, shineVariant]);

  useEffect(() => {
    const remaining = Math.max(0, MIN_OPEN_MS - (Date.now() - openedAt));
    const t = setTimeout(() => setReady(true), remaining);
    return () => clearTimeout(t);
  }, [openedAt]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && ready) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ready, onClose]);

  const flipTransition = !animate
    ? { duration: 0 }
    : reduced
      ? { duration: 0.15 }
      : cardFlipTransition;

  // 12 §B-3 ?flip=fade: 3D rotateY 대신 두 면을 opacity 크로스페이드로 전환한다 —
  // 회전 컨테이너 자체는 안 움직이고(rotateY 고정 0), 각 면이 자기 자신의 opacity만
  // 애니메이션한다.
  const rotateContainerVariants = {
    closed: { rotateY: 0 },
    open: { rotateY: 180, transition: flipTransition },
    closing: { rotateY: 0, transition: cardCloseFlipTransition },
  };
  const fadeContainerVariants = { closed: {}, open: {}, closing: {} };
  const frontFadeVariants = {
    closed: { opacity: 1 },
    open: { opacity: 0, transition: flipTransition },
    closing: { opacity: 1, transition: cardCloseFlipTransition },
  };
  const backFadeVariants = {
    closed: { opacity: 0 },
    open: { opacity: 1, transition: flipTransition },
    closing: { opacity: 0, transition: cardCloseFlipTransition },
  };

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed inset-0 z-40 bg-scrim"
        // 12 §B-3 ?scrim=off: 페이드 없이 즉시 표시.
        initial={toggles.scrimOff ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: toggles.scrimOff ? 0 : reduced ? 0.15 : 0.25 }}
      />
      <div
        className="fixed inset-0 z-50 flex flex-col items-center p-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        <h2 id={titleId} ref={titleRef} tabIndex={-1} className="sr-only">
          카드 {number}번
        </h2>
        <div className="flex w-full flex-1 items-center justify-center">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            // 12 §B-3 ?layout=off: 격자 타일과의 layoutId 공유 레이아웃 애니메이션을 끄고
            // 중앙에서 scale+fade로만 등장시킨다.
            {...(toggles.layoutOff
              ? {
                  initial: { opacity: 0, scale: 0.92 },
                  animate: { opacity: 1, scale: 1 },
                  exit: { opacity: 0, scale: 0.92 },
                  transition: reduced ? { duration: 0.15 } : { duration: 0.3, ease: "easeOut" },
                }
              : {
                  layoutId: `card-${question.id}`,
                  layout: true,
                  transition: reduced ? { duration: 0.15 } : cardMoveSpring,
                })}
            className="relative w-full"
            style={{ maxWidth: "var(--size-card-max)", aspectRatio: "3 / 4.2", perspective: 1200 }}
          >
            <motion.div
              className="relative h-full w-full"
              style={{
                transformStyle: "preserve-3d",
                borderRadius: "var(--radius-card)",
                // 12 §B-3 ?shadow=off: 카드 box-shadow 전부 제거.
                boxShadow: toggles.shadowOff ? "none" : "var(--shadow-lifted)",
                // 12 §B-3 ?fix=ios: 회전 컨테이너를 별도 합성 레이어로 격리하고, 활성 중에만
                // will-change를 준다(계속 켜두면 오히려 iOS에서 레이어가 남아돌 수 있다).
                ...(toggles.fixIos ? { isolation: "isolate", willChange: !shineDone ? "transform" : undefined } : {}),
              }}
              variants={toggles.flipFade ? fadeContainerVariants : rotateContainerVariants}
              initial={playIntro ? "closed" : false}
              animate="open"
              exit="closing"
            >
              <motion.div
                aria-hidden
                className="absolute inset-0"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: toggles.fixIos ? "hidden" : undefined,
                  transform: toggles.fixIos ? "translateZ(0)" : undefined,
                  borderRadius: "var(--radius-card)",
                }}
                variants={toggles.flipFade ? frontFadeVariants : undefined}
              >
                <CardBackFace question={question} used={false} />
              </motion.div>
              <motion.div
                className="absolute inset-0 overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: toggles.fixIos ? "hidden" : undefined,
                  transform: toggles.flipFade
                    ? toggles.fixIos
                      ? "translateZ(0)"
                      : undefined
                    : toggles.fixIos
                      ? "rotateY(180deg) translateZ(0)"
                      : "rotateY(180deg)",
                  borderRadius: "var(--radius-card)",
                }}
                variants={toggles.flipFade ? backFadeVariants : undefined}
              >
                <QuestionCard question={question} revealed={textRevealed} />
                {/* 07 §1, 07 후속(단순화): /dev?shine=v1|v4(기본 v4)로 전환 — v1은 Step 1/2
                    원본 기하 복원, v4는 왼쪽 위→오른쪽 아래 대각선 한 번(와이프+띠, 같은
                    타이밍 공유) + 글로우(같은 타이밍). 끝나면 DOM에서 뺀다(shineDone).
                    일반 열기와 랜덤 뽑기 결과 공개 둘 다 이 경로 하나를 거치므로 효과가 동일하다.
                    11 §B-3: ?shine=off면 전혀 렌더하지 않는다(원인 격리용 임시 토글). */}
                {playIntro && !shineDone && !shineOff && (shineVariant === "v1" ? <CardShineV1 /> : <CardShineV4Sweep />)}
              </motion.div>
              {playIntro && !shineDone && !shineOff && shineVariant === "v4" && <CardShineV4Glow />}
            </motion.div>
          </motion.div>
        </div>

        <div className="w-full" style={{ maxWidth: "var(--size-card-max)" }}>
          <CloseButtonRing openedAt={openedAt} ready={ready} onClose={onClose} />
        </div>
      </div>
    </>
  );
}
