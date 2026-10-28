"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { CardBackFace } from "@/components/CardBackFace";
import { CloseButtonRing } from "@/components/CloseButtonRing";
import { QuestionCard } from "@/components/QuestionCard";
import { MIN_OPEN_MS } from "@/lib/config";
import {
  cardCloseFlipTransition,
  cardFlipTransition,
  cardMoveSpring,
  shineTransition,
  textRevealDelayMs,
} from "@/lib/motion";
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
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
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
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 w-1/3"
                    style={{
                      background:
                        "linear-gradient(100deg, transparent, color-mix(in srgb, white 35%, transparent), transparent)",
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
