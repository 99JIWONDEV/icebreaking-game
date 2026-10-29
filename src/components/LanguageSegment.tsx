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
    // 07 §2-5: 버튼(터치 영역)은 트랙 전체 높이(44px)를 채우고, thumb(보이는 흰 면)만
    // inset-y-1(4px)로 안쪽에 둬서 36px로 보이게 한다 — 이전엔 트랙의 세로 패딩(p-1)이
    // 버튼 자체를 36px로 줄여서 터치 영역이 44px 미만이었다(Playwright 실측으로 발견).
    <div
      className="relative flex gap-1 bg-fill-weak px-1"
      style={{ height: "var(--size-segment-track)", borderRadius: "var(--radius-segment-track)" }}
    >
      {languageOptions.map((option) => {
        const selected = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            onClick={() => setMode(option.mode)}
            className="relative z-10 flex items-center justify-center px-4 text-label text-ink-sub outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            style={{ color: selected ? "var(--color-ink)" : undefined }}
          >
            {selected && (
              <motion.span
                layoutId="language-thumb"
                transition={transition}
                className="absolute inset-x-0 inset-y-1 bg-paper"
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
