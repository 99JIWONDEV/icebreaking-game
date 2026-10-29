"use client";

import { motion } from "motion/react";
import { CardBackFace } from "@/components/CardBackFace";
import { cardShapeStyle } from "@/lib/cardStyle";
import { cardBack, pick } from "@/lib/i18n";
import { categoryOf, questionIndex, type Question } from "@/lib/questions";
import { useViewStore } from "@/store/useViewStore";

export function CardBack({
  question,
  used,
  interactive,
  compact,
  onOpen,
}: {
  question: Question;
  used: boolean;
  interactive: boolean;
  /** 4열 "전체" 구간 보기처럼 카드가 작을 때 — CardBackFace로 전달(변형 A의 No. 라벨 숨김) */
  compact?: boolean;
  onOpen: () => void;
}) {
  const mode = useViewStore((state) => state.mode);
  const number = String(questionIndex(question)).padStart(2, "0");
  const category = categoryOf(question);
  const label = used ? cardBack.used(number, category) : cardBack.closed(number, category);

  return (
    <motion.button
      type="button"
      layoutId={`card-${question.id}`}
      layout
      data-card-id={question.id}
      aria-disabled={!interactive}
      aria-label={pick(mode, label.ko, label.en)}
      onClick={interactive ? onOpen : undefined}
      className="block min-h-[var(--size-touch-min)] w-full"
      style={{
        ...cardShapeStyle,
        cursor: interactive ? "pointer" : "default",
      }}
    >
      <CardBackFace question={question} used={used} compact={compact} />
    </motion.button>
  );
}
