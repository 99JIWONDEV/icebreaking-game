"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { BottomBar, bottomBarClearance } from "@/components/BottomBar";
import { Button } from "@/components/Button";
import { CardGrid } from "@/components/CardGrid";
import { Footer } from "@/components/Footer";
import { LiveAnnouncer } from "@/components/LiveAnnouncer";
import { MenuDrawer } from "@/components/MenuDrawer";
import { OpenCardOverlay } from "@/components/OpenCardOverlay";
import { SequentialGrid } from "@/components/SequentialGrid";
import { TopBar } from "@/components/TopBar";
import { DRAW_RANDOM_STEP_MS, DRAW_RANDOM_SUSPENSE_MS } from "@/lib/config";
import { categoryExhausted, drawRandom as drawRandomCopy, localFallback, menu, pick, progress, topBar } from "@/lib/i18n";
import { categories, questionById, questionsInCategory, questions } from "@/lib/questions";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { hasServerRepository, setActiveMode, useActiveMode, useServerConnected } from "@/lib/table";
import { useTableAnnouncements } from "@/lib/table/useTableAnnouncements";
import { useTableState } from "@/lib/table/useTableState";
import { useViewStore } from "@/store/useViewStore";

const LOCAL_FALLBACK_TIMEOUT_MS = 30_000;

export function MainScreen({ tableNumber, onChangeTable }: { tableNumber: number; onChangeTable: (n: number) => void }) {
  const { state, connection, clientId, drawCard, drawRandom, closeCard, reshuffleCategory } = useTableState(tableNumber);
  const mode = useViewStore((s) => s.mode);
  const category = useViewStore((s) => s.category);
  const reduced = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  const [suspenseTargetId, setSuspenseTargetId] = useState<string | null>(null);
  const [animatedCardId, setAnimatedCardId] = useState<string | null>(null);
  const [prevCardId, setPrevCardId] = useState<string | null | undefined>(undefined);
  const [drawPending, setDrawPending] = useState(false);
  const [localOpenedAt, setLocalOpenedAt] = useState<number | null>(null);
  const [showLocalFallbackPrompt, setShowLocalFallbackPrompt] = useState(false);
  const suspenseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const repoMode = useActiveMode();
  const serverConnected = useServerConnected();

  const { message, notifyLocalClose } = useTableAnnouncements(state, clientId, mode);

  // v3 §4-1: 테이블 시드 셔플 제거 — 격자는 항상 questions.json 배열 순서(번호 순서)다.
  const allOrdered = questions;
  const categoryOrdered = useMemo(() => questionsInCategory(category), [category]);

  const usedIds = useMemo(() => state?.used ?? [], [state]);

  const countsByCategory = useMemo(() => {
    const result: Record<string, { used: number; total: number }> = {};
    const allIds = questions.map((q) => q.id);
    result.all = { used: allIds.filter((id) => usedIds.includes(id)).length, total: allIds.length };
    for (const c of categories) {
      const ids = questionsInCategory(c.id).map((q) => q.id);
      result[c.id] = { used: ids.filter((id) => usedIds.includes(id)).length, total: ids.length };
    }
    return result;
  }, [usedIds]);

  const currentCategoryLabel = useMemo(() => {
    if (category === "all") return menu.all;
    const found = categories.find((c) => c.id === category);
    return found ?? menu.all;
  }, [category]);

  const currentCounts = countsByCategory[category] ?? { used: 0, total: 0 };
  const categoryExhaustedNow = currentCounts.total > 0 && currentCounts.used >= currentCounts.total;

  // 상태 전이를 관찰해 열기 애니메이션을 재생할지(라이브) / 바로 펼쳐 보일지(재접속) 결정한다 — spec §5-1
  // state는 구독 콜백이 새 값을 줄 때만 바뀌므로, useEffect 대신 렌더 중 비교로 처리한다
  // (React 문서의 "prop이 바뀔 때 state를 조정" 패턴 — 불필요한 effect 왕복을 피한다).
  const currCardId = state?.current?.cardId ?? null;
  if (state && currCardId !== prevCardId) {
    const isFirstState = prevCardId === undefined;
    setPrevCardId(currCardId);
    if (!isFirstState) {
      if (currCardId === null) {
        setAnimatedCardId(null);
        setSuspenseTargetId(null);
        setHighlightedCardId(null);
      } else if (state.current?.kind === "random" && !reduced) {
        setSuspenseTargetId(currCardId);
      } else {
        setAnimatedCardId(currCardId);
      }
    }
  }

  // 카드가 실제로 "펼쳐지는" 순간(직접 열기 또는 서스펜스 종료) 한 번 진동 — spec §5-5
  useEffect(() => {
    if (!animatedCardId) return;
    try {
      navigator.vibrate?.(10);
    } catch {
      // ignore — vibration unsupported/blocked
    }
  }, [animatedCardId]);

  // 덮기 링/2초 게이트는 서버 시각이 아니라 "이 기기가 current를 처음 받은 시점"부터 잰다
  // (Part B §4-6 — 서버·기기 시계 불일치 함정). 재접속으로 이미 열린 카드를 받은 경우도 동일.
  // Date.now()는 렌더 중 호출할 수 없어 effect에 남기고, setState만 microtask로 미뤄
  // "effect 안 동기 setState" 규칙을 피한다 — 다음 틱에 반영돼도 지장이 없다(OpenCardOverlay가
  // localOpenedAt이 아직 없을 땐 서버 openedAt으로 대체한다).
  useEffect(() => {
    const value = currCardId ? Date.now() : null;
    queueMicrotask(() => setLocalOpenedAt(value));
  }, [currCardId]);

  // 서버 repository로 연결이 끊긴 채 30초가 지나면 "이 기기에서만 진행" 버튼을 보여준다 (Part B §4-5).
  useEffect(() => {
    if (repoMode !== "server" || connection === "connected") {
      queueMicrotask(() => setShowLocalFallbackPrompt(false));
      return;
    }
    const t = setTimeout(() => setShowLocalFallbackPrompt(true), LOCAL_FALLBACK_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [repoMode, connection]);

  // 랜덤 뽑기 서스펜스: 격자를 40ms 간격으로 훑다가 실제로 뽑힌 카드에서 멈춘다 — spec §5-2
  useEffect(() => {
    if (!suspenseTargetId) return;
    const targetIndex = allOrdered.findIndex((q) => q.id === suspenseTargetId);
    const totalSteps = Math.max(1, Math.round(DRAW_RANDOM_SUSPENSE_MS / DRAW_RANDOM_STEP_MS));
    const stepMs = DRAW_RANDOM_SUSPENSE_MS / totalSteps;
    let step = 0;
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const isLast = step === totalSteps - 1;
      const idx = isLast ? targetIndex : step % allOrdered.length;
      setHighlightedCardId(allOrdered[idx]?.id ?? null);
      step += 1;
      if (step < totalSteps) {
        suspenseTimeoutRef.current = setTimeout(tick, stepMs);
      } else {
        setHighlightedCardId(null);
        setSuspenseTargetId(null);
        setAnimatedCardId(suspenseTargetId);
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (suspenseTimeoutRef.current) clearTimeout(suspenseTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspenseTargetId]);

  if (!state) return null;

  const openQuestion = state.current && !suspenseTargetId ? questionById(state.current.cardId) : null;
  const gridDisabled = !!state.current || connection !== "connected";

  async function handleOpenCard(question: { id: string }) {
    await drawCard(question.id);
  }

  async function handleDrawRandom() {
    setDrawPending(true);
    try {
      await drawRandom(category === "all" ? undefined : category);
    } finally {
      setDrawPending(false);
    }
  }

  async function handleClose() {
    if (!state?.current) return;
    const cardId = state.current.cardId;
    notifyLocalClose(cardId);
    const result = await closeCard(cardId);
    if (result.status === "too_soon") {
      // 기기 시계가 서버보다 앞서 있었을 뿐일 수 있다 — 조용히 한 번 더 시도한다 (Part B §4-6).
      await new Promise((resolve) => setTimeout(resolve, 500));
      await closeCard(cardId);
    }
  }

  async function handleReshuffle() {
    await reshuffleCategory(category);
  }

  return (
    <div className="mx-auto flex min-h-dvh flex-col bg-canvas" style={{ maxWidth: "var(--container-app)" }}>
      <LiveAnnouncer message={message} />
      {repoMode === "server" && connection !== "connected" && (
        <div className="flex flex-col items-center gap-2 px-5 py-2 text-center">
          <p role="status" className="text-label text-danger">
            {pick(mode, topBar.offlineBanner.ko, topBar.offlineBanner.en)}
          </p>
          {showLocalFallbackPrompt && (
            <Button size="sm" variant="outline" onClick={() => setActiveMode("local")}>
              {pick(mode, localFallback.prompt.ko, localFallback.prompt.en)}
            </Button>
          )}
        </div>
      )}
      {repoMode === "local" && hasServerRepository() && serverConnected && (
        <div className="flex justify-center px-5 py-2">
          <Button size="sm" variant="outline" onClick={() => setActiveMode("server")}>
            {pick(mode, localFallback.backToServer.ko, localFallback.backToServer.en)}
          </Button>
        </div>
      )}
      <div inert={!!state.current} className="flex flex-1 flex-col">
        <div style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <TopBar tableNumber={tableNumber} connection={connection} onOpenMenu={() => setMenuOpen(true)} />
        </div>

        <div className="flex flex-col gap-1 px-5 pb-4">
          <h1 className="font-sans text-ink text-title">{pick(mode, currentCategoryLabel.ko, currentCategoryLabel.en)}</h1>
          <p className="text-label text-ink-sub">
            {pick(mode, progress(currentCounts.used, currentCounts.total).ko, progress(currentCounts.used, currentCounts.total).en)}
          </p>
        </div>

        <div className="flex-1 px-5" style={{ paddingBottom: bottomBarClearance(1) }}>
          {category === "all" ? (
            <SequentialGrid
              usedIds={usedIds}
              gridDisabled={gridDisabled}
              highlightedCardId={highlightedCardId}
              openCardId={suspenseTargetId ? null : state.current?.cardId ?? null}
              onOpenCard={handleOpenCard}
            />
          ) : (
            <CardGrid
              key={category}
              questions={categoryOrdered}
              usedIds={usedIds}
              gridDisabled={gridDisabled}
              highlightedCardId={highlightedCardId}
              openCardId={suspenseTargetId ? null : state.current?.cardId ?? null}
              onOpenCard={handleOpenCard}
            />
          )}
          {/* 격자의 기존 paddingBottom(bottomBarClearance) 안쪽에 둬서, 스크롤 끝까지
              내렸을 때 CTA 바 위로 떠 있게 한다 — 카드가 열려 있을 때는 이 div 자체가
              렌더링되지만 OpenCardOverlay가 위에 덮으므로 보이지 않는다. */}
          <Footer />
        </div>

        <BottomBar hidden={!!state.current}>
          {categoryExhaustedNow ? (
            <>
              <p className="text-center text-body text-ink-sub">
                {pick(mode, categoryExhausted.message.ko, categoryExhausted.message.en)}
              </p>
              <Button onClick={handleReshuffle} size="lg" variant="fill">
                {pick(mode, categoryExhausted.reshuffle.ko, categoryExhausted.reshuffle.en)}
              </Button>
            </>
          ) : (
            <Button onClick={handleDrawRandom} size="lg" variant="fill" disabled={gridDisabled} loading={drawPending}>
              {pick(mode, drawRandomCopy.ko, drawRandomCopy.en)}
            </Button>
          )}
        </BottomBar>
      </div>

      <AnimatePresence>
        {openQuestion && state.current && (
          <OpenCardOverlay
            key={state.current.cardId}
            question={openQuestion}
            openedAt={localOpenedAt ?? state.current.openedAt}
            animate={animatedCardId === state.current.cardId}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>

      <MenuDrawer
        open={menuOpen}
        onOpenChange={setMenuOpen}
        tableNumber={tableNumber}
        countsByCategory={countsByCategory}
        onChangeTable={onChangeTable}
      />
    </div>
  );
}
