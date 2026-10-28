"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { LanguageSegment } from "@/components/LanguageSegment";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TABLE_COUNT } from "@/lib/config";
import { menu, pick, tableEntry } from "@/lib/i18n";
import { categories } from "@/lib/questions";
import { useViewStore } from "@/store/useViewStore";

export function MenuDrawer({
  open,
  onOpenChange,
  tableNumber,
  countsByCategory,
  onChangeTable,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: number;
  countsByCategory: Record<string, { used: number; total: number }>;
  onChangeTable: (table: number) => void;
}) {
  const mode = useViewStore((state) => state.mode);
  const category = useViewStore((state) => state.category);
  const setCategory = useViewStore((state) => state.setCategory);
  const [changingTable, setChangingTable] = useState(false);
  const [draftTable, setDraftTable] = useState("");
  const [confirmingTable, setConfirmingTable] = useState<number | null>(null);
  const [tableError, setTableError] = useState(false);

  function startChangeTable() {
    setChangingTable(true);
    setDraftTable("");
    setTableError(false);
  }

  function submitDraftTable() {
    const n = Number(draftTable);
    if (!Number.isInteger(n) || n < 1 || n > TABLE_COUNT) {
      setTableError(true);
      return;
    }
    setConfirmingTable(n);
  }

  function confirmChangeTable() {
    if (confirmingTable === null) return;
    onChangeTable(confirmingTable);
    setConfirmingTable(null);
    setChangingTable(false);
    onOpenChange(false);
  }

  const categoryOptions = [{ id: "all", ko: menu.all.ko, en: menu.all.en }, ...categories];

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="left">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Drawer.Content
          className="fixed inset-y-0 left-0 z-50 flex h-full w-[86%] flex-col bg-canvas outline-none"
          style={{ maxWidth: "20rem" }}
        >
          <Drawer.Title className="sr-only">{pick(mode, menu.title.ko, menu.title.en)}</Drawer.Title>
          <div
            className="flex flex-1 flex-col overflow-y-auto"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <section className="flex flex-col gap-1 px-5 py-5">
              <h3 className="mb-2 text-label text-ink-sub">{pick(mode, menu.category.ko, menu.category.en)}</h3>
              {categoryOptions.map((c) => {
                const selected = c.id === category;
                const counts = countsByCategory[c.id];
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-current={selected}
                    onClick={() => {
                      setCategory(c.id);
                      onOpenChange(false);
                    }}
                    className="flex min-h-[var(--size-touch-min)] items-center justify-between text-body text-ink"
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="w-4 text-accent">
                        {selected ? "✓" : ""}
                      </span>
                      {pick(mode, c.ko, c.en)}
                    </span>
                    {counts && (
                      <span className="text-label text-ink-sub">
                        {counts.used}/{counts.total}
                      </span>
                    )}
                  </button>
                );
              })}
            </section>

            <div className="h-px shrink-0" style={{ backgroundColor: "var(--color-hairline)" }} />

            <section className="flex flex-col gap-3 px-5 py-5">
              <h3 className="text-label text-ink-sub">{pick(mode, menu.table.ko, menu.table.en)}</h3>
              {!changingTable ? (
                <button
                  type="button"
                  onClick={startChangeTable}
                  className="flex min-h-[var(--size-touch-min)] flex-col items-start justify-center gap-1 text-left text-body text-ink"
                >
                  <span>{pick(mode, `${tableNumber}번 테이블`, `Table ${tableNumber}`)}</span>
                  <span className="text-label text-ink-sub">{pick(mode, menu.changeTable.ko, menu.changeTable.en)}</span>
                </button>
              ) : confirmingTable !== null ? (
                <div className="flex flex-col gap-3">
                  <p className="text-body text-ink">{pick(mode, menu.confirmTable(confirmingTable).ko, menu.confirmTable(confirmingTable).en)}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingTable(null)}
                      className="min-h-[var(--size-touch-min)] flex-1 rounded-[var(--radius-cta)] text-btn text-ink"
                      style={{ border: "1px solid var(--color-hairline)" }}
                    >
                      {pick(mode, menu.cancel.ko, menu.cancel.en)}
                    </button>
                    <button
                      type="button"
                      onClick={confirmChangeTable}
                      className="min-h-[var(--size-touch-min)] flex-1 rounded-[var(--radius-cta)] bg-ink text-btn text-paper"
                    >
                      {pick(mode, menu.confirm.ko, menu.confirm.en)}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={draftTable}
                    onChange={(e) => {
                      setDraftTable(e.target.value.replace(/\D/g, ""));
                      setTableError(false);
                    }}
                    className="border-b bg-transparent py-2 text-question-ko-solo text-ink outline-none"
                    style={{ borderColor: tableError ? "var(--color-accent)" : "var(--color-hairline)" }}
                  />
                  {tableError && (
                    <p className="text-label text-accent">
                      {pick(mode, tableEntry.error(TABLE_COUNT).ko, tableEntry.error(TABLE_COUNT).en)}
                    </p>
                  )}
                  <PrimaryButton onClick={submitDraftTable}>{pick(mode, menu.confirm.ko, menu.confirm.en)}</PrimaryButton>
                </div>
              )}
            </section>

            <div className="h-px shrink-0" style={{ backgroundColor: "var(--color-hairline)" }} />

            <section className="flex flex-col gap-2 px-5 py-5">
              <h3 className="text-label text-ink-sub">{pick(mode, menu.language.ko, menu.language.en)}</h3>
              <LanguageSegment />
            </section>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
