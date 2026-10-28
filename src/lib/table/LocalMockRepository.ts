import { MIN_OPEN_MS, STALE_AFTER_MS } from "@/lib/config";
import { cardIdsInCategory, isValidCardId } from "@/lib/questions";
import { getDefaultStorage, type KeyValueStorage } from "@/lib/table/storage";
import type {
  CardKind,
  CloseResult,
  ConnectionState,
  DrawRandomResult,
  DrawResult,
  ReshuffleResult,
  TableRepository,
  TableState,
} from "@/lib/table/types";

export type DevOptions = {
  latency: { enabled: boolean; minMs: number; maxMs: number };
  failureRate: number;
  forceOffline: boolean;
};

const DEFAULT_DEV_OPTIONS: DevOptions = {
  latency: { enabled: false, minMs: 80, maxMs: 300 },
  failureRate: 0,
  forceOffline: false,
};

type Subscription = {
  table: number;
  onState: (s: TableState) => void;
  onConn: (c: ConnectionState) => void;
};

type BroadcastPayload = { type: "state"; table: number; state: TableState };

/**
 * Mocks a real-time, multi-device table backend using localStorage (persistence)
 * + BroadcastChannel (cross-tab push), so a few browser tabs on the same machine
 * can stand in for "several phones at the same table" during Step 2.
 *
 * CAS is emulated by always re-reading the latest persisted state right before
 * the check-then-write in each method body, which runs synchronously (no await
 * in between) — see 03_table-sync-spec.md §3. This closes the race window to the
 * gap between two tabs' JS ticks, which is not true atomicity but is enough to
 * reproduce every exception in spec §4 for manual/automated testing. A real
 * backend (Convex/Supabase, see spec §7) performs this as one serializable
 * transaction instead.
 */
export class LocalMockRepository implements TableRepository {
  private storage: KeyValueStorage;
  private now: () => number;
  private channel: BroadcastChannel | null;
  private subs = new Set<Subscription>();
  private connectionState: ConnectionState = "connected";
  private devOptions: DevOptions = DEFAULT_DEV_OPTIONS;

  constructor(options?: { storage?: KeyValueStorage; now?: () => number; channelName?: string }) {
    this.storage = options?.storage ?? getDefaultStorage();
    this.now = options?.now ?? (() => Date.now());
    this.channel = this.createChannel(options?.channelName ?? "icebreaker:table-sync");
  }

  private createChannel(name: string): BroadcastChannel | null {
    if (typeof BroadcastChannel === "undefined") return null;
    const channel = new BroadcastChannel(name);
    channel.addEventListener("message", (event: MessageEvent<BroadcastPayload>) => {
      const data = event.data;
      if (data?.type !== "state") return;
      const current = this.readState(data.table);
      if (data.state.updatedAt < current.updatedAt) return; // stale message, ignore
      this.storage.setItem(this.key(data.table), JSON.stringify(data.state));
      this.notifyState(data.table, data.state);
    });
    return channel;
  }

  private key(table: number): string {
    return `icebreaker:table:${table}`;
  }

  private readState(table: number): TableState {
    const raw = this.storage.getItem(this.key(table));
    if (raw) {
      try {
        return JSON.parse(raw) as TableState;
      } catch {
        // fall through to a fresh default below
      }
    }
    const fresh: TableState = { number: table, epoch: 0, current: null, used: [], updatedAt: this.now() };
    this.storage.setItem(this.key(table), JSON.stringify(fresh));
    return fresh;
  }

  private writeState(table: number, state: TableState): void {
    this.storage.setItem(this.key(table), JSON.stringify(state));
    this.notifyState(table, state);
    this.channel?.postMessage({ type: "state", table, state } satisfies BroadcastPayload);
  }

  private notifyState(table: number, state: TableState): void {
    for (const sub of this.subs) {
      if (sub.table === table) sub.onState(state);
    }
  }

  private notifyConn(): void {
    for (const sub of this.subs) sub.onConn(this.connectionState);
  }

  subscribe(
    table: number,
    onState: (s: TableState) => void,
    onConn: (c: ConnectionState) => void,
  ): () => void {
    const sub: Subscription = { table, onState, onConn };
    this.subs.add(sub);
    onState(this.readState(table));
    onConn(this.connectionState);
    return () => {
      this.subs.delete(sub);
    };
  }

  private async gate<T>(run: () => T): Promise<T> {
    if (this.devOptions.forceOffline || this.connectionState === "offline") {
      throw new Error("offline");
    }
    if (this.devOptions.latency.enabled) {
      const { minMs, maxMs } = this.devOptions.latency;
      const delay = minMs + Math.random() * Math.max(0, maxMs - minMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    if (this.devOptions.failureRate > 0 && Math.random() < this.devOptions.failureRate) {
      throw new Error("simulated failure");
    }
    return run();
  }

  private openCard(
    state: TableState,
    cardId: string,
    clientId: string,
    kind: CardKind,
  ): { status: "opened"; state: TableState } {
    const next: TableState = {
      ...state,
      current: { cardId, openedAt: this.now(), kind, by: clientId },
      updatedAt: this.now(),
    };
    this.writeState(state.number, next);
    return { status: "opened", state: next };
  }

  async drawCard(a: { table: number; cardId: string; epoch: number; clientId: string }): Promise<DrawResult> {
    return this.gate(() => {
      const state = this.readState(a.table);
      if (state.epoch !== a.epoch) return { status: "reset", state };
      if (!isValidCardId(a.cardId)) return { status: "invalid", state };
      if (state.used.includes(a.cardId)) return { status: "already_used", state };
      if (state.current) {
        if (state.current.cardId === a.cardId && state.current.by === a.clientId) {
          return { status: "opened", state }; // idempotent retry / double-tap
        }
        if (this.now() - state.current.openedAt > STALE_AFTER_MS) {
          const freed: TableState = {
            ...state,
            used: [...state.used, state.current.cardId],
            current: null,
            updatedAt: this.now(),
          };
          this.writeState(a.table, freed);
          return this.openCard(freed, a.cardId, a.clientId, "pick");
        }
        return { status: "busy", state };
      }
      return this.openCard(state, a.cardId, a.clientId, "pick");
    });
  }

  async drawRandom(a: {
    table: number;
    category?: string;
    epoch: number;
    clientId: string;
  }): Promise<DrawRandomResult> {
    return this.gate(() => {
      let state = this.readState(a.table);
      if (state.epoch !== a.epoch) return { status: "reset", state };
      if (state.current && this.now() - state.current.openedAt > STALE_AFTER_MS) {
        const freed: TableState = {
          ...state,
          used: [...state.used, state.current.cardId],
          current: null,
          updatedAt: this.now(),
        };
        this.writeState(a.table, freed);
        state = freed;
      }
      if (state.current) return { status: "busy", state };
      const pool = cardIdsInCategory(a.category ?? "all").filter((id) => !state.used.includes(id));
      if (pool.length === 0) return { status: "exhausted", state };
      const cardId = pool[Math.floor(Math.random() * pool.length)];
      const opened = this.openCard(state, cardId, a.clientId, "random");
      return { status: "opened", state: opened.state };
    });
  }

  async closeCard(a: { table: number; cardId: string; epoch: number; clientId: string }): Promise<CloseResult> {
    return this.gate(() => {
      const state = this.readState(a.table);
      if (state.epoch !== a.epoch) return { status: "reset", state };
      if (!state.current || state.current.cardId !== a.cardId) return { status: "noop", state };
      if (this.now() - state.current.openedAt < MIN_OPEN_MS) return { status: "too_soon", state };
      const next: TableState = {
        ...state,
        current: null,
        used: [...state.used, a.cardId],
        updatedAt: this.now(),
      };
      this.writeState(a.table, next);
      return { status: "closed", state: next };
    });
  }

  async reshuffleCategory(a: { table: number; category: string; epoch: number }): Promise<ReshuffleResult> {
    return this.gate(() => {
      const state = this.readState(a.table);
      if (state.epoch !== a.epoch) return { status: "reset", state };
      const ids = cardIdsInCategory(a.category);
      const allUsed = ids.every((id) => state.used.includes(id));
      if (!allUsed) return { status: "not_exhausted", state };
      const next: TableState = {
        ...state,
        used: state.used.filter((id) => !ids.includes(id)),
        updatedAt: this.now(),
      };
      this.writeState(a.table, next);
      return { status: "reshuffled", state: next };
    });
  }

  // ---- dev-only helpers, not part of TableRepository — used by /dev only ----

  devResetTable(table: number): void {
    const state = this.readState(table);
    const next: TableState = {
      ...state,
      epoch: state.epoch + 1,
      current: null,
      used: [],
      updatedAt: this.now(),
    };
    this.writeState(table, next);
  }

  getDevOptions(): DevOptions {
    return this.devOptions;
  }

  setDevOptions(partial: Partial<DevOptions>): void {
    this.devOptions = { ...this.devOptions, ...partial };
    if (typeof partial.forceOffline !== "boolean") return;
    if (partial.forceOffline) {
      this.connectionState = "offline";
      this.notifyConn();
      return;
    }
    this.connectionState = "reconnecting";
    this.notifyConn();
    setTimeout(() => {
      if (this.devOptions.forceOffline) return;
      this.connectionState = "connected";
      this.notifyConn();
    }, 600);
  }
}

export const tableRepository: LocalMockRepository = new LocalMockRepository();
