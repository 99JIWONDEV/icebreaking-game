"use client";

import { useId, useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/Button";
import { LanguageSegment } from "@/components/LanguageSegment";
import { TableNumberInput } from "@/components/TableNumberInput";
import { TABLE_COUNT } from "@/lib/config";
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
    // v3 후속: vaul은 기본적으로 Radix Dialog의 "열리면 포커스를 다이얼로그로 옮기는" 동작을
    // 막는다(autoFocus 기본값 false) — 그래서 지금까지는 열어도 포커스가 메뉴 버튼에 그대로
    // 남아 있었다(Playwright로 확인). autoFocus를 켜면 Radix가 Drawer.Content(이미 outline-none,
    // 안쪽 요소로 점프하지 않음)로 포커스를 옮긴다 — 시각적 링 없이 접근성 요구(다이얼로그가
    // 열리면 포커스가 그 안으로 들어가야 한다)만 충족한다.
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="left" autoFocus>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Drawer.Content
          // 07 §2-5: 닫을 때 포커스가 메뉴 버튼으로 돌아와야 한다 — Radix 기본 복귀가
          // 왜인지 안 돼서(Playwright로 확인, body로 감) 직접 처리한다. vaul의 Content는
          // onCloseAutoFocus를 안 가로채고 그대로 Radix Dialog.Content에 넘긴다.
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.querySelector<HTMLElement>("[data-menu-trigger]")?.focus();
          }}
          className="fixed inset-y-0 left-0 z-50 flex h-full w-[86%] flex-col bg-paper outline-none"
          style={{ maxWidth: "20rem", borderRight: "1px solid var(--color-hairline)" }}
        >
          <Drawer.Title className="sr-only">{pick(mode, menu.title.ko, menu.title.en)}</Drawer.Title>
          <div
            className="flex flex-1 flex-col overflow-y-auto"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <section className="flex flex-col px-5 pt-5">
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
                    className="flex items-center justify-between text-body text-ink outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
                    style={{
                      height: "3.5rem",
                      borderTop: index > 0 ? "1px solid var(--color-hairline)" : undefined,
                    }}
                  >
                    <span className="flex items-center gap-2.5">{pick(mode, c.ko, c.en)}</span>
                    <span className="flex items-center gap-2">
                      {counts && (
                        <span className="text-label text-ink-sub">
                          {counts.used}/{counts.total}
                        </span>
                      )}
                      {selected && (
                        <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </section>

            {/* v3 후속 2차 수정: 구분선 위/아래를 "보이는 콘텐츠 기준" 20px로 맞춘다. 카테고리
                행은 56px 안에서 텍스트가 가운데 정렬이라 행 끝과 텍스트 보이는 아래 끝 사이에
                이미 ~18px 내부 여백이 있다(실측, .review/menu_precise.mjs) — 그만큼 margin-top을
                줄여서 보정한다. 구분선 아래는 라벨 자체 line-height 여백(~1px)만 있던 걸
                padding-top으로 채워 20px로 맞춘다. */}
            <section
              className="flex flex-col gap-3 px-5 pb-5"
              style={{ marginTop: "0.125rem", borderTop: "1px solid var(--color-hairline)", paddingTop: "1.1875rem" }}
            >
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
                    <Button onClick={() => setConfirmingTable(null)} size="lg" variant="outline">
                      {pick(mode, menu.cancel.ko, menu.cancel.en)}
                    </Button>
                    <Button onClick={confirmChangeTable} size="lg" variant="fill">
                      {pick(mode, menu.confirm.ko, menu.confirm.en)}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <TableNumberInput
                    id={draftInputId}
                    value={draftTable}
                    onChange={(v) => {
                      setDraftTable(v);
                      setTableError(false);
                    }}
                    error={tableError}
                  />
                  <Button onClick={submitDraftTable} size="lg" variant="fill">
                    {pick(mode, menu.confirm.ko, menu.confirm.en)}
                  </Button>
                </div>
              )}
            </section>

            <section
              className="flex flex-col gap-2 px-5 pb-5"
              style={{ borderTop: "1px solid var(--color-hairline)", paddingTop: "1.1875rem" }}
            >
              <h3 className="text-label text-ink-sub">{pick(mode, menu.language.ko, menu.language.en)}</h3>
              <LanguageSegment />
            </section>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
