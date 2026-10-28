import { categoryColorVar } from "@/lib/categoryColors";
import { questionIndex, type Question } from "@/lib/questions";

/** Pure visual — the back-of-card look, reused by the grid tile button and the flip overlay. */
export function CardBackFace({ question, used }: { question: Question; used: boolean }) {
  const number = questionIndex(question);
  const catColor = categoryColorVar(question.category);
  const background = used ? `color-mix(in srgb, ${catColor}, var(--color-canvas) 60%)` : catColor;
  const borderColor = `color-mix(in srgb, ${catColor}, var(--color-ink) 28%)`;
  const frameColor = `color-mix(in srgb, ${catColor}, var(--color-ink) 22%)`;

  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      style={{ borderRadius: "var(--radius-track)", background, border: `1px solid ${borderColor}` }}
    >
      <span
        aria-hidden
        className="absolute inset-[6px] rounded-[inherit]"
        style={{ border: `1px solid ${frameColor}` }}
      />
      <span className="flex flex-col items-center gap-1.5">
        <span className="font-serif-kr text-ink text-label">{String(number).padStart(2, "0")}</span>
        {used && <span aria-hidden className="size-[5px] rounded-full bg-accent" />}
      </span>
    </div>
  );
}
