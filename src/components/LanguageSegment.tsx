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
    // v3 후속: 트랙은 늘어나지 않고(items-stretch 기본) 버튼이 패딩을 뺀 높이(36px)를
    // 그대로 채우게 한다 — 이전엔 items-center라 버튼이 글자 줄 높이만큼만(18px 안팎)
    // 짧아서 thumb(버튼의 inset-0 자식)도 같이 짧아 보였다.
    <div
      className="relative flex gap-1 bg-fill-weak p-1"
      style={{ height: "var(--size-segment-track)", borderRadius: "var(--radius-segment-track)" }}
    >
      {languageOptions.map((option) => {
        const selected = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            onClick={() => setMode(option.mode)}
            className="relative z-10 flex items-center justify-center px-4 text-label text-ink-sub transition-colors"
            style={{ color: selected ? "var(--color-ink)" : undefined }}
          >
            {selected && (
              <motion.span
                layoutId="language-thumb"
                transition={transition}
                className="absolute inset-0 bg-paper"
                style={{
                  borderRadius: "var(--radius-btn)",
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
