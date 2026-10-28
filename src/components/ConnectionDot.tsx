import type { ConnectionState } from "@/lib/table/types";

/** Static only — DESIGN.md bans infinite-repeat animation, so no pulsing spinner here. */
export function ConnectionDot({ connection }: { connection: ConnectionState }) {
  const color = connection === "offline" ? "var(--color-accent)" : "var(--color-ink-sub)";

  return (
    <span
      aria-hidden
      className="inline-block size-[6px] rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
