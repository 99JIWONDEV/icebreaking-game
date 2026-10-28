"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { CardBackFace } from "@/components/CardBackFace";
import { CloseButtonRing } from "@/components/CloseButtonRing";
import { QuestionCard } from "@/components/QuestionCard";
import { MIN_OPEN_MS } from "@/lib/config";
import { cardCloseFlipTransition, cardFlipTransition, cardMoveSpring, shineTransition, textRevealDelayMs } from "@/lib/motion";
import { questionIndex, type Question } from "@/lib/questions";
import { useReducedMotion } from "@/lib/useReducedMotion";

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
  const [textRevealed, setTextRevealed] = useState(!playIntro);
  const [ready, setReady] = useState(false);
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
                {playIntro && (
                  // 디자인 v3 후속 §3: Step 1/2 원본 스윕(git show c5c2fa4) 기하를 그대로
                  // 복원했다 — 각도 100deg, 폭 1/3, 0.85s 지연/0.9s 지속/easeInOut 전부 원본.
                  // 원본은 당시 카드 면(#FAF6EE, 크림색) 위에 흰 35% 그라디언트라 보였지만,
                  // 지금 카드 면은 #FFFFFF라 흰색은 원리상 안 보인다(흰 위에 흰은 불투명도와
                  // 무관하게 흰으로 합성된다). 색만 하나의 부드러운 ink 톤 피크로 바꿨다 —
                  // 이전 시도(5% 가장자리 두 줄)는 "어둡다"는 피드백을 받아, 더 옅고(4%) 가장자리
                  // 둘이 아니라 가운데 하나의 완만한 산 모양으로 바꿔 더 밝게 보이게 했다.
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 w-1/3"
                    style={{
                      background:
                        "linear-gradient(100deg, transparent, color-mix(in srgb, var(--color-ink) 7%, transparent), transparent)",
                    }}
                    initial={{ left: "-40%" }}
                    animate={{ left: "110%" }}
                    transition={shineTransition}
                  />
                )}
              </div>
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
