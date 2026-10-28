"use client";

import { CardGrid } from "@/components/CardGrid";
import { categorySections } from "@/lib/categorySections";
import { pick } from "@/lib/i18n";
import type { Question } from "@/lib/questions";
import { useViewStore } from "@/store/useViewStore";

/**
 * "전체" 보기의 기본값 — 1~55를 번호 순서대로, 카테고리 구간마다 헤더를 붙여 나열한다
 * (v3 §4-2). 구간 헤더는 `<h2>`, 구간은 `<section aria-labelledby>`로 의미 구조를 준다.
 */
export function SequentialGrid({
  usedIds,
  gridDisabled,
  highlightedCardId,
  openCardId,
  onOpenCard,
}: {
  usedIds: string[];
  gridDisabled: boolean;
  highlightedCardId: string | null;
  openCardId: string | null;
  onOpenCard: (question: Question) => void;
}) {
  const mode = useViewStore((state) => state.mode);
  const sections = categorySections();

  return (
    <div className="flex flex-col" style={{ gap: "var(--size-section-gap)" }}>
      {sections.map((section) => {
        const headingId = `section-${section.category.id}-heading`;
        const used = section.questions.filter((q) => usedIds.includes(q.id)).length;
        const rangeLabel = `${String(section.start).padStart(2, "0")}–${String(section.end).padStart(2, "0")}`;
        return (
          <section key={section.category.id} aria-labelledby={headingId} className="flex flex-col gap-3">
            <h2 id={headingId} className="flex items-baseline justify-between">
              <span className="font-sans text-ink text-btn">{pick(mode, section.category.ko, section.category.en)}</span>
              <span className="flex items-baseline gap-1.5 text-label text-ink-sub" style={{ fontVariantNumeric: "tabular-nums" }}>
                {rangeLabel}
                <span aria-hidden>·</span>
                <span>
                  {used}/{section.questions.length}
                </span>
              </span>
            </h2>
            <CardGrid
              questions={section.questions}
              usedIds={usedIds}
              gridDisabled={gridDisabled}
              highlightedCardId={highlightedCardId}
              openCardId={openCardId}
              onOpenCard={onOpenCard}
              columns={4}
              gap="var(--size-grid-gap-all)"
              compact
            />
          </section>
        );
      })}
    </div>
  );
}
