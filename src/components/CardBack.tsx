"use client";

import { motion } from "motion/react";
import { CardBackFace } from "@/components/CardBackFace";
import { cardShapeStyle } from "@/lib/cardStyle";
import { cardBack, pick } from "@/lib/i18n";
import { questionIndex, type Question } from "@/lib/questions";
import { useViewStore } from "@/store/useViewStore";

export function CardBack({
  question,
  used,
  interactive,
  onOpen,
}: {
  question: Question;
  used: boolean;
  interactive: boolean;
  onOpen: () => void;
}) {
  const mode = useViewStore((state) => state.mode);
  const number = questionIndex(question);
  const label = used ? cardBack.used(number) : cardBack.closed(number);

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
        opacity: used ? 0.4 : 1,
        cursor: interactive ? "pointer" : "default",
      }}
    >
      <CardBackFace question={question} used={used} />
    </motion.button>
  );
}
