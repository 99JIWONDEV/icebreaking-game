"use client";

import { motion } from "motion/react";
import { cardShapeStyle } from "@/lib/cardStyle";
import { sourceLabel } from "@/lib/i18n";
import { textRevealStaggerMs } from "@/lib/motion";
import { categoryOf, questionIndex, questions, type Question } from "@/lib/questions";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useViewStore } from "@/store/useViewStore";

export function QuestionCard({
  question,
  revealed = true,
}: {
  question: Question;
  /** false = ko/en text starts hidden, then fades/rises in staggered (used by OpenCardOverlay phase ⑤). */
  revealed?: boolean;
}) {
  const mode = useViewStore((state) => state.mode);
  const reduced = useReducedMotion();
  const category = categoryOf(question);
  const total = questions.length;
  const order = questionIndex(question);
  const solo = mode !== "both";

  const koClass = `text-pretty font-sans text-ink ${
    solo ? "text-question-ko-solo" : "text-question-ko-both"
  }`;
  const enClass = `text-pretty font-sans ${
    solo ? "text-question-en-solo" : "text-question-en-both"
  }`;

  const hidden = { opacity: 0, y: reduced ? 0 : 6 };
  const shown = { opacity: 1, y: 0 };

  return (
    <div
      className="relative flex h-full w-full flex-col bg-paper p-7"
      style={{
        ...cardShapeStyle,
        border: "1px solid var(--color-hairline)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-label text-ink-sub">
          {sourceLabel(mode, category)}
        </span>
        <span className="text-label text-ink-sub">
          {String(order).padStart(2, "0")} / {total}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-3">
        {mode !== "en" && (
          <motion.p
            lang="ko"
            className={koClass}
            initial={revealed ? false : hidden}
            animate={shown}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {question.ko}
          </motion.p>
        )}
        {mode !== "ko" && (
          <motion.p
            lang="en"
            className={enClass}
            style={{ color: mode === "both" ? "var(--color-ink-sub)" : "var(--color-ink)" }}
            initial={revealed ? false : hidden}
            animate={shown}
            transition={{ duration: 0.3, ease: "easeOut", delay: revealed ? 0 : textRevealStaggerMs / 1000 }}
          >
            {question.en}
          </motion.p>
        )}
      </div>
    </div>
  );
}
