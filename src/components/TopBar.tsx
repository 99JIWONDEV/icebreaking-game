"use client";

import { ConnectionDot } from "@/components/ConnectionDot";
import { pick, topBar } from "@/lib/i18n";
import type { ConnectionState } from "@/lib/table/types";
import { useViewStore } from "@/store/useViewStore";

export function TopBar({
  tableNumber,
  connection,
  onOpenMenu,
}: {
  tableNumber: number;
  connection: ConnectionState;
  onOpenMenu: () => void;
}) {
  const mode = useViewStore((state) => state.mode);
  const table = topBar.table(tableNumber);

  return (
    <header
      className="flex items-center justify-between px-5"
      style={{ height: "var(--size-topbar)" }}
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={pick(mode, topBar.menuLabel.ko, topBar.menuLabel.en)}
        className="flex size-11 items-center justify-center text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
      >
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden>
          <path d="M0 1h20M0 7h20M0 13h20" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <ConnectionDot connection={connection} />
        <span className="text-label text-ink-sub">{pick(mode, table.ko, table.en)}</span>
      </div>
    </header>
  );
}
