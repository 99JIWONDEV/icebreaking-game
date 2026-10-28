import { questionIndex, type Question } from "@/lib/questions";

/** Pure visual — the back-of-card look, reused by the grid tile button and the flip overlay. */
export function CardBackFace({ question, used }: { question: Question; used: boolean }) {
  const number = questionIndex(question);
  return (
    <div
      className="card-back-texture relative flex h-full w-full items-center justify-center bg-ink"
      style={{ borderRadius: "var(--radius-track)" }}
    >
      <span
        aria-hidden
        className="absolute inset-[6px] rounded-[inherit]"
        style={{ border: "1px solid color-mix(in srgb, var(--color-paper) 18%, transparent)" }}
      />
      <span className="flex flex-col items-center gap-1.5">
        <span className="font-serif-kr text-paper text-label">{String(number).padStart(2, "0")}</span>
        {used && <span aria-hidden className="size-[5px] rounded-full bg-accent" />}
      </span>
    </div>
  );
}
