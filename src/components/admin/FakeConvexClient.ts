import { getFunctionName } from "convex/server";

/**
 * /dev/admin-preview 전용 가짜 Convex 클라이언트 — 실서버 없이 관리자 화면(로그인/격자/확인/결과)을
 * 스크린샷으로 확인하려고 만들었다. **서버 동작을 검증하지 않는다**(실제 규칙은 convex/admin.ts와
 * convex/admin.test.ts). production에서는 이 라우트가 404라 쓰이지 않는다.
 */
type Row = { tableNo: number; openedCount: number; epoch: number; updatedAt: number | null };
type LogRow = { id: string; at: number; action: "reset_table" | "reset_all"; tableNo: number | null; openedBefore: number; tablesReset: number | null; via: "admin" | "cli" };

export const PREVIEW_PASSCODE = "preview-passcode-1234";

export function createFakeClient(scenario: string | null) {
  const now = Date.now();
  let tables: Row[] = Array.from({ length: 20 }, (_, i) => {
    const used = [12, 0, 3, 0, 27, 0, 8, 1, 0, 40, 0, 5, 0, 0, 19, 0, 2, 0, 0, 55][i];
    return { tableNo: i + 1, openedCount: used, epoch: 0, updatedAt: used ? now - (i + 1) * 70_000 : null };
  });
  let log: LogRow[] = [
    { id: "l1", at: now - 3_600_000, action: "reset_table", tableNo: 4, openedBefore: 7, tablesReset: null, via: "admin" },
  ];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const token = "p".repeat(64);

  function result(name: string) {
    if (name === "admin:listTables") return { status: "ok", tables, total: 55 };
    if (name === "admin:recentLog") return { status: "ok", rows: log };
    return undefined;
  }

  return {
    watchQuery(ref: never) {
      const name = getFunctionName(ref);
      return {
        localQueryResult: () => result(name),
        onUpdate(cb: () => void) {
          listeners.add(cb);
          return () => listeners.delete(cb);
        },
        journal: () => undefined,
      };
    },
    async mutation(ref: never, args: Record<string, unknown>) {
      const name = getFunctionName(ref);
      if (name === "admin:checkPasscode") {
        if (scenario === "locked") return { status: "locked", retryAfterMs: 9 * 60_000 + 30_000 };
        if (scenario === "notconfigured") return { status: "not_configured" };
        return args.passcode === PREVIEW_PASSCODE ? { status: "ok", token } : { status: "denied" };
      }
      if (name === "admin:resetTable") {
        const t = tables.find((r) => r.tableNo === args.tableNo);
        if (!t) return { status: "invalid" };
        log = [{ id: `l${log.length + 1}`, at: Date.now(), action: "reset_table", tableNo: t.tableNo, openedBefore: t.openedCount, tablesReset: null, via: "admin" }, ...log];
        tables = tables.map((r) => (r === t ? { ...r, openedCount: 0, epoch: r.epoch + 1, updatedAt: Date.now() } : r));
        notify();
        return { status: "ok", openedBefore: t.openedCount };
      }
      if (name === "admin:resetAllTables") {
        const opened = tables.reduce((s, r) => s + r.openedCount, 0);
        log = [{ id: `l${log.length + 1}`, at: Date.now(), action: "reset_all", tableNo: null, openedBefore: opened, tablesReset: tables.length, via: "admin" }, ...log];
        tables = tables.map((r) => ({ ...r, openedCount: 0, epoch: r.epoch + 1, updatedAt: Date.now() }));
        notify();
        return { status: "ok", done: true, tablesReset: tables.length, openedBefore: opened };
      }
      return { status: "ok" };
    },
    connectionState: () => ({ isWebSocketConnected: true }),
    subscribeToConnectionState: () => () => {},
  };
}
