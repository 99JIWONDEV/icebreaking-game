"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { CardBackFace } from "@/components/CardBackFace";
import { CardShineV1, CardShineV4Glow, CardShineV4Sweep } from "@/components/CardShine";
import { CloseButtonRing } from "@/components/CloseButtonRing";
import { QuestionCard } from "@/components/QuestionCard";
import { MIN_OPEN_MS } from "@/lib/config";
import { cardCloseFlipTransition, cardFlipTransition, cardMoveSpring, shineV1Transition, shineV4Transition, textRevealDelayMs } from "@/lib/motion";
import { questionIndex, type Question } from "@/lib/questions";
import { useReducedMotion } from "@/lib/useReducedMotion";
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
  const shineVariant = useShineVariant();
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

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed inset-0 z-40 bg-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.15 : 0.25 }}
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
            layoutId={`card-${question.id}`}
            layout
            transition={reduced ? { duration: 0.15 } : cardMoveSpring}
            className="relative w-full"
            style={{ maxWidth: "var(--size-card-max)", aspectRatio: "3 / 4.2", perspective: 1200 }}
          >
            <motion.div
              className="relative h-full w-full"
              style={{
                transformStyle: "preserve-3d",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-lifted)",
              }}
              variants={{
                closed: { rotateY: 0 },
                open: { rotateY: 180, transition: flipTransition },
                closing: { rotateY: 0, transition: cardCloseFlipTransition },
              }}
              initial={playIntro ? "closed" : false}
              animate="open"
              exit="closing"
            >
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ backfaceVisibility: "hidden", borderRadius: "var(--radius-card)" }}
              >
                <CardBackFace question={question} used={false} />
              </div>
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  borderRadius: "var(--radius-card)",
                }}
              >
                <QuestionCard question={question} revealed={textRevealed} />
                {/* 07 §1, 07 후속(단순화): /dev?shine=v1|v4(기본 v4)로 전환 — v1은 Step 1/2
                    원본 기하 복원, v4는 왼쪽 위→오른쪽 아래 대각선 한 번(와이프+띠, 같은
                    타이밍 공유) + 글로우(같은 타이밍). 끝나면 DOM에서 뺀다(shineDone).
                    일반 열기와 랜덤 뽑기 결과 공개 둘 다 이 경로 하나를 거치므로 효과가 동일하다. */}
                {playIntro && !shineDone && (shineVariant === "v1" ? <CardShineV1 /> : <CardShineV4Sweep />)}
              </div>
              {playIntro && !shineDone && shineVariant === "v4" && <CardShineV4Glow />}
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
