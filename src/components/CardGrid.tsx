"use client";

import { motion } from "motion/react";
import { CardBack } from "@/components/CardBack";
import { CATEGORY_ENTER_TOTAL_MS, CATEGORY_STAGGER_MS } from "@/lib/config";
import type { Question } from "@/lib/questions";
import { useReducedMotion } from "@/lib/useReducedMotion";

export function CardGrid({
  category,
  questions,
  usedIds,
  gridDisabled,
  highlightedCardId,
  openCardId,
  onOpenCard,
}: {
  category: string;
  /** already in table-seeded display order — see seededShuffle(questionsInCategory(category), tableNumber) */
  questions: Question[];
  usedIds: string[];
  gridDisabled: boolean;
  highlightedCardId: string | null;
  /** The card currently rendered by OpenCardOverlay — its grid tile is swapped for an
   *  empty placeholder so the two don't fight over the same layoutId at once. */
  openCardId: string | null;
  onOpenCard: (question: Question) => void;
}) {
  const reduced = useReducedMotion();
  const columns = category === "all" ? 4 : 3;
  // 20ms 간격이 기본이지만, 카드가 많은 "전체" 보기에서도 총 진입 시간이 spec의 600ms 상한을 넘지 않도록 좁힌다.
  const stepMs =
    questions.length > 1
      ? Math.min(CATEGORY_STAGGER_MS, CATEGORY_ENTER_TOTAL_MS / (questions.length - 1))
      : 0;

  return (
    <div
      key={category}
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: category === "all" ? "var(--size-grid-gap-all)" : "var(--size-grid-gap)",
      }}
    >
      {questions.map((question, index) => {
        const used = usedIds.includes(question.id);
        const highlighted = highlightedCardId === question.id;
        if (question.id === openCardId) {
          return <div key={question.id} aria-hidden style={{ aspectRatio: "3 / 4.2" }} />;
        }
        return (
          <motion.div
            key={question.id}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index * stepMs) / 1000, duration: 0.3, ease: "easeOut" }}
            className="rounded-[var(--radius-track)] transition-[box-shadow] duration-150"
            style={{ boxShadow: highlighted ? "0 0 0 2px var(--color-ink)" : "none" }}
          >
            <CardBack
              question={question}
              used={used}
              interactive={!used && !gridDisabled}
              onOpen={() => onOpenCard(question)}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
