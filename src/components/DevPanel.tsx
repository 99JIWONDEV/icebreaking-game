"use client";

import { useEffect, useState } from "react";
import { setCardVariant, useCardVariant, type CardVariant } from "@/lib/cardVariant";
import { tableRepository } from "@/lib/table/LocalMockRepository";
import { useTableState } from "@/lib/table/useTableState";
import { questions } from "@/lib/questions";

export function DevPanel() {
  const [table, setTable] = useState(1);
  const { state, connection } = useTableState(table);
  const cardVariant = useCardVariant();

  // v3 §5: /dev?card=a|b로 카드 프레임 변형을 전환 — localStorage에 저장돼 메인 화면에도 적용된다.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("card");
    if (param === "a" || param === "b") setCardVariant(param);
  }, []);
  const [cardNumber, setCardNumber] = useState("1");
  const [offline, setOffline] = useState(false);
  const [latencyOn, setLatencyOn] = useState(false);
  const [minMs, setMinMs] = useState(80);
  const [maxMs, setMaxMs] = useState(300);
  const [failureRate, setFailureRate] = useState(0);

  if (!state) return null;

  const idx = Math.min(questions.length, Math.max(1, Number(cardNumber) || 1)) - 1;
  const targetCardId = questions[idx]?.id;

  function otherOpen() {
    if (!state || !targetCardId) return;
    void tableRepository.drawCard({
      table,
      cardId: targetCardId,
      epoch: state.epoch,
      clientId: `dev-other-${Date.now()}`,
    });
  }

  function otherClose() {
    if (!state?.current) return;
    void tableRepository.closeCard({
      table,
      cardId: state.current.cardId,
      epoch: state.epoch,
      clientId: `dev-other-${Date.now()}`,
    });
  }

  function resetTable() {
    tableRepository.devResetTable(table);
  }

  function toggleOffline() {
    const next = !offline;
    setOffline(next);
    tableRepository.setDevOptions({ forceOffline: next });
  }

  function applyLatency(enabled: boolean, min: number, max: number) {
    setLatencyOn(enabled);
    tableRepository.setDevOptions({ latency: { enabled, minMs: min, maxMs: max } });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-6 bg-canvas p-5 text-ink">
      <h1 className="text-title">/dev — 테이블 동기화 디버그 패널</h1>
      <p className="text-label text-ink-sub">production 빌드에서는 404로 막힙니다.</p>

      <section className="flex flex-col gap-2">
        <h2 className="text-label text-ink-sub">테이블</h2>
        <input
          type="number"
          value={table}
          onChange={(e) => setTable(Number(e.target.value) || 1)}
          className="w-24 border px-2 py-1"
          style={{ borderColor: "var(--color-hairline)" }}
        />
        <pre className="overflow-auto rounded bg-fill-weak p-3 text-xs">{JSON.stringify(state, null, 2)}</pre>
        <p className="text-label">connection: {connection}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-label text-ink-sub">다른 사용자 흉내</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="card-number" className="text-label">
            카드 번호 (1-55)
          </label>
          <input
            id="card-number"
            type="number"
            min={1}
            max={questions.length}
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-20 border px-2 py-1"
            style={{ borderColor: "var(--color-hairline)" }}
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={otherOpen} className="rounded bg-ink px-3 py-2 text-paper">
            다른 사용자가 카드 {cardNumber}번 열기
          </button>
          <button type="button" onClick={otherClose} className="rounded border px-3 py-2" style={{ borderColor: "var(--color-hairline)" }}>
            다른 사용자가 덮기
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-label text-ink-sub">관리자 흉내</h2>
        <button type="button" onClick={resetTable} className="w-fit rounded border px-3 py-2" style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}>
          테이블 초기화 (epoch +1)
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-label text-ink-sub">카드 디자인 (v3 §5 — ?card=a|b로도 전환 가능)</h2>
        <p className="text-label">현재: 변형 {cardVariant.toUpperCase()}</p>
        <div className="flex gap-2">
          {(["a", "b"] as CardVariant[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setCardVariant(v)}
              className="rounded border px-3 py-2"
              style={{
                borderColor: v === cardVariant ? "var(--color-ink)" : "var(--color-hairline)",
                fontWeight: v === cardVariant ? 700 : 400,
              }}
            >
              변형 {v.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-label text-ink-sub">연결</h2>
        <button type="button" onClick={toggleOffline} className="w-fit rounded border px-3 py-2" style={{ borderColor: "var(--color-hairline)" }}>
          {offline ? "연결 복구" : "연결 끊기"}
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-label text-ink-sub">인위적 지연 / 실패 주입</h2>
        <label className="flex items-center gap-2 text-body">
          <input
            type="checkbox"
            checked={latencyOn}
            onChange={(e) => applyLatency(e.target.checked, minMs, maxMs)}
          />
          지연 사용
        </label>
        <div className="flex items-center gap-2">
          <span className="text-label">{minMs}ms –</span>
          <input
            type="range"
            min={0}
            max={1000}
            value={minMs}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMinMs(v);
              applyLatency(latencyOn, v, maxMs);
            }}
          />
          <input
            type="range"
            min={0}
            max={1000}
            value={maxMs}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMaxMs(v);
              applyLatency(latencyOn, minMs, v);
            }}
          />
          <span className="text-label">– {maxMs}ms</span>
        </div>
        <label className="flex items-center gap-2 text-body">
          실패율 {Math.round(failureRate * 100)}%
          <input
            type="range"
            min={0}
            max={100}
            value={failureRate * 100}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              setFailureRate(v);
              tableRepository.setDevOptions({ failureRate: v });
            }}
          />
        </label>
      </section>
    </div>
  );
}
