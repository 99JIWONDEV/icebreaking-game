"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BottomBar, bottomBarClearance } from "@/components/BottomBar";
import { Button } from "@/components/Button";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import {
  allConfirmText,
  copy,
  lockedMessage,
  resetDone,
  singleConfirmText,
} from "@/components/admin/adminCopy";
import { formatRelativeKo, useNow } from "@/lib/useNow";

type Confirm = { kind: "one"; tableNo: number } | { kind: "all" } | null;

function errorFor(r: { status: string; retryAfterMs?: number }): string {
  if (r.status === "denied") return copy.denied;
  if (r.status === "locked") return lockedMessage(r.retryAfterMs ?? 0);
  if (r.status === "not_configured") return copy.notConfigured;
  return copy.failed;
}

const timeFormat = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function AdminTables({
  token,
  passcode,
  onExpired,
  onSignOut,
}: {
  token: string;
  passcode: string;
  onExpired: () => void;
  onSignOut: () => void;
}) {
  const data = useQuery(api.admin.listTables, { token });
  const resetTable = useMutation(api.admin.resetTable);
  const resetAllTables = useMutation(api.admin.resetAllTables);
  const now = useNow();

  const [selected, setSelected] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [logOpen, setLogOpen] = useState(false);
  // 감사 로그는 펼쳤을 때만 구독한다(안 보는 구독은 함수 호출 수만 늘린다 — 사용량)
  const log = useQuery(api.admin.recentLog, logOpen ? { token } : "skip");

  const denied = data?.status === "denied";
  useEffect(() => {
    if (denied) queueMicrotask(onExpired); // 서버가 세션을 지웠다(4시간 경과/로그아웃) — 다시 로그인
  }, [denied, onExpired]);

  if (data === undefined || data.status === "denied") {
    return (
      <p role="status" className="px-5 pt-6 text-center text-body text-ink-sub-bg">
        {copy.loading}
      </p>
    );
  }

  const tables = data.tables;
  const totalOpened = tables.reduce((sum, t) => sum + t.openedCount, 0);
  const selectedTable = tables.find((t) => t.tableNo === selected) ?? null;

  function close() {
    if (busy) return;
    setConfirm(null);
    setDialogError(null);
  }

  async function run() {
    if (!confirm) return;
    setBusy(true);
    setDialogError(null);
    try {
      const r =
        confirm.kind === "one"
          ? await resetTable({ passcode, tableNo: confirm.tableNo })
          : await resetAllTables({ passcode });
      if (r.status === "ok") {
        setResult(resetDone(confirm.kind === "one" ? confirm.tableNo : null, tables.length));
        setConfirm(null);
        if (confirm.kind === "one") setSelected(null);
      } else {
        setDialogError(r.status === "invalid" ? copy.failed : errorFor(r));
      }
    } catch {
      setDialogError(copy.failed); // 연결 실패 — 서버 상태는 바뀌지 않았을 수 있다(확인 필요)
    } finally {
      setBusy(false);
    }
  }

  const single = confirm?.kind === "one" ? tables.find((t) => t.tableNo === confirm.tableNo) : null;
  const text =
    confirm?.kind === "one" && single
      ? singleConfirmText(single.tableNo, single.openedCount)
      : allConfirmText(tables.length, totalOpened);

  return (
    <div
      className="flex min-h-dvh flex-col px-5"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: bottomBarClearance(2) }}
    >
      <header className="flex items-center justify-between" style={{ height: "var(--size-topbar)" }}>
        <h1 className="text-btn text-ink">{copy.title}</h1>
        <Button size="sm" variant="outline" onClick={onSignOut}>
          {copy.signOut}
        </Button>
      </header>

      <p role="status" aria-live="polite" className="min-h-[1.125rem] text-label text-ink-sub-bg">
        {result}
      </p>

      <section aria-label={copy.tableGridLabel} className="mt-4">
        <div className="grid grid-cols-4" style={{ gap: "var(--size-grid-gap-all)" }}>
          {tables.map((t) => {
            const isSelected = t.tableNo === selected;
            const empty = t.openedCount === 0;
            return (
              <button
                key={t.tableNo}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelected(isSelected ? null : t.tableNo)}
                className="relative flex min-h-[5.5rem] flex-col items-center justify-center bg-paper outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                style={{
                  borderRadius: "var(--radius-track)",
                  // 선택 = 색이 아니라 테두리 두께 + 체크. 1px→2px 늘어난 만큼 padding을 줄여 칸이 안 움직인다.
                  border: isSelected ? "2px solid var(--color-ink)" : "1px solid var(--color-hairline)",
                  padding: isSelected ? 0 : "1px",
                }}
              >
                <span className={`text-card-number-sm ${empty ? "text-ink-sub" : "text-ink"}`}>
                  <span className="sr-only">테이블</span>{" "}
                  {t.tableNo}
                </span>
                <span className="text-label text-ink-sub">
                  <span className="sr-only">열린 카드</span>{" "}
                  {t.openedCount}/{data.total}
                </span>
                <span className="text-caption text-ink-sub">
                  {empty || t.updatedAt === null ? (
                    "—"
                  ) : (
                    <>
                      <span className="sr-only">마지막 활동</span>{" "}
                      {formatRelativeKo(t.updatedAt, now)}
                    </>
                  )}
                </span>
                {isSelected && (
                  <svg className="absolute right-1 top-1" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <details className="mt-8" onToggle={(e) => setLogOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer py-3 text-label text-ink-sub-bg">{copy.auditLog}</summary>
        <div className="rounded-xl bg-paper p-3" style={{ border: "1px solid var(--color-hairline)" }}>
          {log === undefined || log.status === "denied" ? (
            <p className="text-caption text-ink-sub">{copy.loading}</p>
          ) : log.rows.length === 0 ? (
            <p className="text-caption text-ink-sub">{copy.auditEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {log.rows.map((r) => (
                <li key={r.id} className="text-caption text-ink">
                  <span className="text-ink-sub">{timeFormat.format(r.at)}</span>{" "}
                  {r.action === "reset_table"
                    ? `테이블 초기화 · ${r.tableNo}번`
                    : `전체 초기화 · ${r.tablesReset ?? 0}개`}{" "}
                  <span className="text-ink-sub">
                    · 열린 카드 {r.openedBefore}장 · {r.via === "cli" ? "CLI" : "관리자"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <BottomBar hidden={confirm !== null}>
        <Button
          size="lg"
          variant="fill"
          disabled={selectedTable === null}
          onClick={() => selectedTable && setConfirm({ kind: "one", tableNo: selectedTable.tableNo })}
        >
          {selectedTable ? copy.resetTable(selectedTable.tableNo) : copy.resetTableNone}
        </Button>
        {/* 위험 버튼은 위 버튼과 간격을 더 둔다 */}
        <div className="mt-3">
          <Button size="lg" variant="danger" onClick={() => setConfirm({ kind: "all" })}>
            {copy.resetAll}
          </Button>
        </div>
      </BottomBar>

      <AdminConfirmDialog
        key={confirm ? (confirm.kind === "one" ? `one-${confirm.tableNo}` : "all") : "none"}
        open={confirm !== null}
        title={confirm?.kind === "all" ? copy.resetAll : copy.resetTable(confirm?.kind === "one" ? confirm.tableNo : 0)}
        ko={text.ko}
        en={text.en}
        requireWord={confirm?.kind === "all" ? copy.confirmWord : undefined}
        busy={busy}
        error={dialogError}
        onCancel={close}
        onConfirm={run}
      />
    </div>
  );
}
