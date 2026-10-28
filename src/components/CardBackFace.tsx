import { questionIndex, type Question } from "@/lib/questions";

/** Pure visual — the back-of-card look, reused by the grid tile button and the flip overlay.
 *  Minimal system: paper + hairline border, the number is the only content. No category
 *  color, no inner frame, no texture — used cards are told apart by a flat fill-weak tint. */
export function CardBackFace({ question, used }: { question: Question; used: boolean }) {
  const number = questionIndex(question);

  return (
    <div
      className={`flex h-full w-full items-center justify-center ${used ? "bg-fill-weak" : "bg-paper"}`}
      style={{ borderRadius: "var(--radius-track)", border: "1px solid var(--color-hairline)" }}
    >
      <span className="font-sans text-ink text-card-number">{String(number).padStart(2, "0")}</span>
    </div>
  );
}
