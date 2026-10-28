"use client";

import { motion } from "motion/react";
import { languageOptions } from "@/lib/i18n";
import { useMotionTransition } from "@/lib/useReducedMotion";
import { useViewStore } from "@/store/useViewStore";

export function LanguageSegment() {
  const mode = useViewStore((state) => state.mode);
  const setMode = useViewStore((state) => state.setMode);
  const transition = useMotionTransition();

  return (
    <div
      className="relative flex items-center gap-1 bg-fill-weak p-1"
      style={{ height: "var(--size-segment-track)", borderRadius: "var(--radius-segment-track)" }}
    >
      {languageOptions.map((option) => {
        const selected = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            onClick={() => setMode(option.mode)}
            className="relative z-10 px-3 text-label text-ink-sub transition-colors"
            style={{ color: selected ? "var(--color-ink)" : undefined }}
          >
            {selected && (
              <motion.span
                layoutId="language-thumb"
                transition={transition}
                className="absolute inset-0 bg-paper"
                style={{
                  borderRadius: "calc(var(--radius-segment-track) - 0.1875rem)",
                  border: "1px solid var(--color-hairline)",
                  zIndex: -1,
                }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
