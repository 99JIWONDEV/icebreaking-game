"use client";

import { motion } from "motion/react";
import { CardBack } from "@/components/CardBack";
import { CATEGORY_ENTER_TOTAL_MS, CATEGORY_STAGGER_MS } from "@/lib/config";
import type { Question } from "@/lib/questions";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * 번호 순서(questions.json 배열 순서, 테이블 시드 셔플 없음 — v3 §4-1)대로 카드를 N열로
 * 늘어놓는 평평한 격자. 단독으로(카테고리 필터 보기) 쓰거나, SequentialGrid가 구간마다
 * 하나씩 조립해서(전체 보기) 쓴다.
 */
export function CardGrid({
  questions,
  usedIds,
  gridDisabled,
  highlightedCardId,
  openCardId,
  onOpenCard,
  columns = 3,
  gap = "var(--size-grid-gap)",
  compact = false,
}: {
  questions: Question[];
  usedIds: string[];
  gridDisabled: boolean;
  highlightedCardId: string | null;
  /** The card currently rendered by OpenCardOverlay — its grid tile is swapped for an
   *  empty placeholder so the two don't fight over the same layoutId at once. */
  openCardId: string | null;
  onOpenCard: (question: Question) => void;
  columns?: number;
  gap?: string;
  /** 4열 "전체" 보기 구간처럼 카드가 작을 때 — CardBackFace의 No. 라벨을 숨긴다(변형 A) */
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  // 20ms 간격이 기본이지만, 카드가 많은 구간에서도 총 진입 시간이 spec의 600ms 상한을 넘지 않도록 좁힌다.
  const stepMs =
    questions.length > 1
      ? Math.min(CATEGORY_STAGGER_MS, CATEGORY_ENTER_TOTAL_MS / (questions.length - 1))
      : 0;

  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap }}>
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
              compact={compact}
              onOpen={() => onOpenCard(question)}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
