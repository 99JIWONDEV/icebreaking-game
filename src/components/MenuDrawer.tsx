"use client";

import { useId, useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/Button";
import { LanguageSegment } from "@/components/LanguageSegment";
import { TableNumberInput } from "@/components/TableNumberInput";
import { TABLE_COUNT } from "@/lib/config";
import { categoryColorVar } from "@/lib/categoryColors";
import { menu, pick } from "@/lib/i18n";
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
  const draftInputId = useId();

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
          style={{ maxWidth: "20rem", borderRight: "1px solid var(--color-hairline)" }}
        >
          <Drawer.Title className="sr-only">{pick(mode, menu.title.ko, menu.title.en)}</Drawer.Title>
          <div
            className="flex flex-1 flex-col overflow-y-auto"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <section className="flex flex-col px-5 py-5">
              <h3 className="mb-1 text-label text-ink-sub">{pick(mode, menu.category.ko, menu.category.en)}</h3>
              {categoryOptions.map((c, index) => {
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
                    className="flex items-center justify-between text-body text-ink"
                    style={{
                      height: "3.5rem",
                      borderTop: index > 0 ? "1px solid var(--color-hairline)" : undefined,
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      {c.id !== "all" && (
                        <span aria-hidden className="size-2 rounded-full" style={{ background: categoryColorVar(c.id) }} />
                      )}
                      {pick(mode, c.ko, c.en)}
                    </span>
                    <span className="flex items-center gap-2">
                      {counts && (
                        <span className="text-label text-ink-sub">
                          {counts.used}/{counts.total}
                        </span>
                      )}
                      {selected && (
                        <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </section>

            <div className="h-px shrink-0" style={{ backgroundColor: "var(--color-hairline)" }} />

            <section className="flex flex-col gap-3 px-5 py-5">
              <h3 className="text-label text-ink-sub">{pick(mode, menu.table.ko, menu.table.en)}</h3>
              {!changingTable ? (
                <div className="flex flex-col items-start gap-2">
                  <span className="text-body text-ink">{pick(mode, `${tableNumber}번 테이블`, `Table ${tableNumber}`)}</span>
                  <Button onClick={startChangeTable} size="sm" variant="outline">
                    {pick(mode, menu.changeTable.ko, menu.changeTable.en)}
                  </Button>
                </div>
              ) : confirmingTable !== null ? (
                <div className="flex flex-col gap-3">
                  <p className="text-body text-ink">{pick(mode, menu.confirmTable(confirmingTable).ko, menu.confirmTable(confirmingTable).en)}</p>
                  <div className="flex gap-2">
                    <Button onClick={() => setConfirmingTable(null)} size="lg" variant="outline" display="full">
                      {pick(mode, menu.cancel.ko, menu.cancel.en)}
                    </Button>
                    <Button onClick={confirmChangeTable} size="lg" variant="fill" display="full">
                      {pick(mode, menu.confirm.ko, menu.confirm.en)}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <TableNumberInput
                    id={draftInputId}
                    value={draftTable}
                    onChange={(v) => {
                      setDraftTable(v);
                      setTableError(false);
                    }}
                    error={tableError}
                  />
                  <Button onClick={submitDraftTable} size="lg" variant="fill" display="full">
                    {pick(mode, menu.confirm.ko, menu.confirm.en)}
                  </Button>
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
