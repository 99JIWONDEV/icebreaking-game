"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { Drawer } from "vaul";
import { Button } from "@/components/Button";
import { LanguageSegment } from "@/components/LanguageSegment";
import { TableNumberInput } from "@/components/TableNumberInput";
import { TABLE_COUNT } from "@/lib/config";
import { menu, pick, tableEntry, tableNumberHintRanged, tableNumberLabel } from "@/lib/i18n";
import { categories } from "@/lib/questions";
import { useReducedMotion } from "@/lib/useReducedMotion";
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
  const reduced = useReducedMotion();
  // 09 §2: 기존엔 changingTable(입력) → confirmingTable(재확인) 2단계였는데, 한 단계로
  // 합쳤다 — 입력 + 취소/확인 버튼 한 줄, 별도 재확인 화면 없음.
  const [editingTable, setEditingTable] = useState(false);
  const [draftTable, setDraftTable] = useState("");
  const [tableError, setTableError] = useState(false);
  const draftInputId = useId();
  const draftErrorId = `${draftInputId}-help`;
  const changeTableBtnRef = useRef<HTMLButtonElement>(null);
  const editGroupRef = useRef<HTMLDivElement>(null);
  const wasEditingRef = useRef(false);

  // 10 §3-3: 편집 블록(입력+힌트+취소/확인)이 키보드 위에서 가려지지 않게 scrollIntoView
  // 한다. 처음엔 "250ms 타이머나 resize 중 먼저 오는 쪽에 한 번만"으로 짰는데, 키보드가
  // 열리는 동안 resize가 여러 번(점점 줄어들며) 오는 실제 상황에서 250ms 타이머가 먼저
  // 터져 "한 번"을 다 써버리면 — 그 뒤에 오는, 실제로 다 줄어든 뒤의 resize는 무시된다
  // (Playwright로 뷰포트를 줄여 재현해서 발견: 편집 블록이 드로어 바깥에 남아 있었다).
  // 그래서 debounce로 바꿨다 — resize가 올 때마다 250ms를 다시 재고, 250ms 동안 resize가
  // 더 안 오면(키보드 애니메이션이 끝났다고 보고) 그때 딱 한 번 스크롤한다.
  useEffect(() => {
    if (!editingTable) return;
    const el = editGroupRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const scrollOnce = () => el.scrollIntoView({ block: "nearest" });
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(scrollOnce, 250);
    };
    resetTimer();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", resetTimer);
    return () => {
      clearTimeout(timer);
      vv?.removeEventListener("resize", resetTimer);
    };
  }, [editingTable]);

  // 취소/ESC로 기본 상태로 돌아갈 때 포커스를 "테이블 변경" 버튼으로 돌린다 — 버튼은
  // editingTable이 false로 바뀐 뒤에야 DOM에 다시 생기므로 핸들러 안에서 바로 focus()할
  // 수 없다(아직 마운트 전). prop 변화가 아니라 사용자 액션에 대한 반응이라 동기 setState는
  // 없고 DOM 포커스 이동만 하므로 effect 규칙에 어긋나지 않는다.
  useEffect(() => {
    if (wasEditingRef.current && !editingTable) {
      changeTableBtnRef.current?.focus();
    }
    wasEditingRef.current = editingTable;
  }, [editingTable]);

  function startChangeTable() {
    setEditingTable(true);
    setDraftTable("");
    setTableError(false);
  }

  function cancelChangeTable() {
    setEditingTable(false);
    setDraftTable("");
    setTableError(false);
  }

  function confirmChangeTable() {
    const n = Number(draftTable);
    if (!Number.isInteger(n) || n < 1 || n > TABLE_COUNT) {
      setTableError(true);
      return;
    }
    if (n !== tableNumber) {
      onChangeTable(n);
      onOpenChange(false);
    }
    setEditingTable(false);
    setDraftTable("");
    setTableError(false);
  }

  function handleDraftKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmChangeTable();
    } else if (e.key === "Escape") {
      // vaul/Radix Dialog도 document 레벨에서 Escape를 들어서 드로어 전체를 닫는다 —
      // preventDefault만으로는 안 막혀서(Playwright 키보드 테스트로 확인: 드로어가
      // 같이 닫혀버림) stopPropagation도 같이 호출해 이벤트가 더 올라가지 않게 한다.
      // 편집 블록만 취소되고 드로어는 열린 채로 남아야 한다(09 §2).
      e.preventDefault();
      e.stopPropagation();
      cancelChangeTable();
    }
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
        {/* 10 §3-2: inset-0 대신 visualViewport 기준(top/height)으로 — iOS는 키보드가
            열려도 레이아웃 뷰포트(inset-0의 기준)를 안 줄이고 비주얼 뷰포트만 줄인다.
            12 §A-3: 11에서 --layout-h(= innerHeight)까지 늘렸는데, 실기기(iPhone 시크릿
            Chrome)에서 여전히 끊겼다 — iOS Chrome은 키보드가 열리면 innerHeight도 같이
            줄어들 수 있어서(확인 필요, ?debug=vv로 실측 예정) --layout-h ≈ --vv-height가
            돼 버려 늘린 게 무효화됐을 가능성이 있다. --layout-h에 기대지 않고, 고정
            480px를 더해 **항상** 키보드보다 충분히 길게 만든다 — fixed라 문서 스크롤에
            영향 없고, 아래쪽은 화면 밖이라 무해하다. */}
        <Drawer.Overlay
          className="fixed inset-x-0 z-40 bg-scrim"
          style={{ top: "var(--vv-top, 0px)", height: "calc(var(--vv-height, 100dvh) + 480px)" }}
        />
        <Drawer.Content
          // 07 §2-5: 닫을 때 포커스가 메뉴 버튼으로 돌아와야 한다 — Radix 기본 복귀가
          // 왜인지 안 돼서(Playwright로 확인, body로 감) 직접 처리한다. vaul의 Content는
          // onCloseAutoFocus를 안 가로채고 그대로 Radix Dialog.Content에 넘긴다.
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.querySelector<HTMLElement>("[data-menu-trigger]")?.focus();
          }}
          // 09 §2: 편집 중 Escape는 편집만 취소해야 한다(드로어 전체가 닫히면 안 됨).
          // Radix의 Escape-닫기는 document에 캡처 단계로 붙어 있어서 입력의 onKeyDown에서
          // preventDefault/stopPropagation을 해도 막히지 않는다(Playwright로 확인 —
          // 캡처는 document→target 순서라 target의 핸들러보다 먼저 실행된다). vaul의
          // Drawer.Content가 그대로 넘겨주는 onEscapeKeyDown(Radix 쪽 공식 훅)에서 막아야
          // 한다.
          onEscapeKeyDown={(e) => {
            if (editingTable) {
              e.preventDefault();
              cancelChangeTable();
            }
          }}
          className="fixed left-0 z-50 flex w-[86%] flex-col bg-paper outline-none"
          style={{
            top: "var(--vv-top, 0px)",
            // 12 §A-3: scrim과 같은 이유로 --layout-h 대신 고정 480px 추가 — 안쪽 스크롤
            // 영역(아래)만 --vv-height로 제한해서, 패널 자체는 그보다 길게 흰 배경(bg-paper)
            // 으로 채운다.
            height: "calc(var(--vv-height, 100dvh) + 480px)",
            maxWidth: "20rem",
            borderRight: "1px solid var(--color-hairline)",
          }}
        >
          <Drawer.Title className="sr-only">{pick(mode, menu.title.ko, menu.title.en)}</Drawer.Title>
          {/* 10 §3-2, 11 §A: 이 영역만 --vv-height(실제 보이는 비주얼 뷰포트 높이)로 제한해서
              스크롤한다 — flex-1(부모 높이를 그대로 채움) 대신 명시적 높이를 줘서, 부모
              패널(--layout-h, 더 큼)보다 짧게 남기고 그 아래는 패널 자체의 흰 배경이
              보이게 한다. overscroll-behavior: contain으로 끝까지 스크롤했을 때 뒤 페이지로
              스크롤이 새지 않게(iOS 체이닝 방지), -webkit-overflow-scrolling으로 관성 스크롤
              유지. 아래쪽 safe-area 여백은 키보드가 열리면 0으로 줄어든다
              (--drawer-bottom-pad, globals.css). */}
          <div
            className="flex flex-col overflow-y-auto"
            style={{
              height: "var(--vv-height, 100dvh)",
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "var(--drawer-bottom-pad)",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            }}
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
            {/* 09 §2 "기본 상태 = 건드리지 않는다": 섹션 라벨, {n}번 테이블 텍스트,
                "테이블 변경" 버튼의 크기/패딩/radius/테두리/글자/색/위치/간격은 그대로다.
                "테이블 변경"을 누르면 그 버튼이 있던 자리만 편집 블록으로 바뀐다. */}
            <motion.section
              layout
              transition={reduced ? { duration: 0 } : { duration: 0.15 }}
              className="flex flex-col gap-3 px-5 pb-5"
              style={{ marginTop: "0.125rem", borderTop: "1px solid var(--color-hairline)", paddingTop: "1.1875rem" }}
            >
              <h3 className="text-label text-ink-sub">{pick(mode, menu.table.ko, menu.table.en)}</h3>
              {/* 기존 구조 그대로: span→기본 버튼은 8px(gap-2) — section의 gap-3(12px)을
                  그대로 쓰면 간격이 바뀌므로 이 안쪽 래퍼는 자체 gap을 쓰지 않는다. 편집
                  블록은 09 §2대로 span 아래 12px(mt-3)을 따로 준다. */}
              <div className="flex w-full flex-col items-start">
                <span className="text-body text-ink">{pick(mode, `${tableNumber}번 테이블`, `Table ${tableNumber}`)}</span>
                {!editingTable ? (
                  <div className="mt-2">
                    <Button ref={changeTableBtnRef} onClick={startChangeTable} size="sm" variant="outline">
                      {pick(mode, menu.changeTable.ko, menu.changeTable.en)}
                    </Button>
                  </div>
                ) : (
                  <div
                    ref={editGroupRef}
                    role="group"
                    aria-label={pick(mode, menu.changeTableGroupLabel.ko, menu.changeTableGroupLabel.en)}
                    className="mt-3 flex w-full flex-col"
                  >
                    <TableNumberInput
                      id={draftInputId}
                      value={draftTable}
                      onChange={(v) => {
                        setDraftTable(v);
                        setTableError(false);
                      }}
                      error={tableError}
                      autoFocus
                      ariaLabel={pick(mode, tableNumberLabel.ko, tableNumberLabel.en)}
                      ariaDescribedBy={draftErrorId}
                      onKeyDown={handleDraftKeyDown}
                    />
                    {tableError ? (
                      <p
                        id={draftErrorId}
                        className="mt-2 flex items-center justify-center gap-1 text-center text-label"
                        style={{ color: "var(--color-danger)" }}
                        aria-live="polite"
                      >
                        <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6.25" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M7 4v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="7" cy="9.75" r="0.75" fill="currentColor" />
                        </svg>
                        {pick(mode, tableEntry.error(TABLE_COUNT).ko, tableEntry.error(TABLE_COUNT).en)}
                      </p>
                    ) : (
                      <p id={draftErrorId} className="mt-2 text-center text-caption text-ink-sub">
                        {pick(mode, tableNumberHintRanged(TABLE_COUNT).ko, tableNumberHintRanged(TABLE_COUNT).en)}
                      </p>
                    )}
                    <div className="mt-5 flex justify-end gap-2">
                      <Button onClick={cancelChangeTable} size="md" variant="weak">
                        {pick(mode, menu.cancel.ko, menu.cancel.en)}
                      </Button>
                      <Button onClick={confirmChangeTable} size="md" variant="fill">
                        {pick(mode, menu.confirm.ko, menu.confirm.en)}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>

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
