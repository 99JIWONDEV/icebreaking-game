import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { allCardIds, cardIdsInCategory, isValidCardId } from "./lib/cards";

const DEFAULT_CONFIG = { tableCount: 20, minOpenMs: 2000, staleAfterMs: 600_000 } as const;

const MIN_CLIENT_ID_LEN = 8;
const MAX_CLIENT_ID_LEN = 64;

function isValidClientId(clientId: string): boolean {
  return clientId.length >= MIN_CLIENT_ID_LEN && clientId.length <= MAX_CLIENT_ID_LEN;
}

async function getConfig(ctx: QueryCtx | MutationCtx) {
  const doc = await ctx.db.query("config").first();
  return doc ?? DEFAULT_CONFIG;
}

async function findTable(ctx: QueryCtx | MutationCtx, number: number) {
  return ctx.db
    .query("tables")
    .withIndex("by_number", (q) => q.eq("number", number))
    .unique();
}

function toState(doc: Doc<"tables">) {
  return {
    number: doc.number,
    epoch: doc.epoch,
    current: doc.current,
    used: doc.used,
    updatedAt: doc.updatedAt,
  };
}

export const get = query({
  args: { number: v.number() },
  handler: async (ctx, { number }) => {
    const doc = await findTable(ctx, number);
    if (!doc) return { exists: false as const };
    return { exists: true as const, state: toState(doc) };
  },
});

/** 멱등 — 이미 있는 테이블은 건너뛴다. 관리자 함수나 `npx convex run tables:seed`로 호출. */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const config = await getConfig(ctx);
    let created = 0;
    for (let number = 1; number <= config.tableCount; number++) {
      const existing = await findTable(ctx, number);
      if (existing) continue;
      await ctx.db.insert("tables", { number, epoch: 0, current: null, used: [], updatedAt: Date.now() });
      created++;
    }
    return { created, tableCount: config.tableCount };
  },
});

export const drawCard = mutation({
  args: { table: v.number(), cardId: v.string(), epoch: v.number(), clientId: v.string() },
  handler: async (ctx, { table, cardId, epoch, clientId }) => {
    if (!isValidClientId(clientId)) return { status: "invalid" as const };
    const doc = await findTable(ctx, table);
    if (!doc) return { status: "invalid" as const };
    if (doc.epoch !== epoch) return { status: "reset" as const, state: toState(doc) };
    if (!isValidCardId(cardId)) return { status: "invalid" as const, state: toState(doc) };
    if (doc.used.includes(cardId)) return { status: "already_used" as const, state: toState(doc) };

    const now = Date.now();
    const config = await getConfig(ctx);

    if (doc.current) {
      if (doc.current.cardId === cardId && doc.current.by === clientId) {
        return { status: "opened" as const, state: toState(doc) }; // 더블 탭 — 멱등
      }
      if (now - doc.current.openedAt > config.staleAfterMs) {
        const used = [...doc.used, doc.current.cardId];
        const current = { cardId, openedAt: now, kind: "pick" as const, by: clientId };
        await ctx.db.patch(doc._id, { used, current, updatedAt: now });
        return { status: "opened" as const, state: { ...toState(doc), used, current, updatedAt: now } };
      }
      return { status: "busy" as const, state: toState(doc) };
    }

    const current = { cardId, openedAt: now, kind: "pick" as const, by: clientId };
    await ctx.db.patch(doc._id, { current, updatedAt: now });
    return { status: "opened" as const, state: { ...toState(doc), current, updatedAt: now } };
  },
});

export const drawRandom = mutation({
  args: { table: v.number(), category: v.optional(v.string()), epoch: v.number(), clientId: v.string() },
  handler: async (ctx, { table, category, epoch, clientId }) => {
    if (!isValidClientId(clientId)) return { status: "invalid" as const };
    const doc = await findTable(ctx, table);
    if (!doc) return { status: "invalid" as const };
    if (doc.epoch !== epoch) return { status: "reset" as const, state: toState(doc) };

    const now = Date.now();
    const config = await getConfig(ctx);
    let used = doc.used;
    let current = doc.current;

    if (current && now - current.openedAt > config.staleAfterMs) {
      used = [...used, current.cardId];
      current = null;
      await ctx.db.patch(doc._id, { used, current, updatedAt: now });
    }

    if (current) return { status: "busy" as const, state: { ...toState(doc), used, current, updatedAt: now } };

    const pool = (category ? cardIdsInCategory(category) : allCardIds()).filter((id) => !used.includes(id));
    if (pool.length === 0) return { status: "exhausted" as const, state: { ...toState(doc), used, current, updatedAt: now } };

    // Convex 런타임의 Math.random()은 함수 실행 동안 결정적(시드 고정)이라 재시도에도 안전하다 (spec §2 "이미 확인된 사실" 재확인됨).
    const cardId = pool[Math.floor(Math.random() * pool.length)];
    const next = { cardId, openedAt: now, kind: "random" as const, by: clientId };
    await ctx.db.patch(doc._id, { current: next, updatedAt: now });
    return { status: "opened" as const, state: { ...toState(doc), used, current: next, updatedAt: now } };
  },
});

export const closeCard = mutation({
  args: { table: v.number(), cardId: v.string(), epoch: v.number(), clientId: v.string() },
  handler: async (ctx, { table, cardId, epoch }) => {
    const doc = await findTable(ctx, table);
    if (!doc) return { status: "invalid" as const };
    if (doc.epoch !== epoch) return { status: "reset" as const, state: toState(doc) };
    if (!doc.current || doc.current.cardId !== cardId) return { status: "noop" as const, state: toState(doc) };

    const config = await getConfig(ctx);
    const now = Date.now();
    if (now - doc.current.openedAt < config.minOpenMs) return { status: "too_soon" as const, state: toState(doc) };

    const used = [...doc.used, cardId];
    await ctx.db.patch(doc._id, { current: null, used, updatedAt: now });
    return { status: "closed" as const, state: { ...toState(doc), current: null, used, updatedAt: now } };
  },
});

export const reshuffleCategory = mutation({
  args: { table: v.number(), category: v.string(), epoch: v.number() },
  handler: async (ctx, { table, category, epoch }) => {
    const doc = await findTable(ctx, table);
    if (!doc) return { status: "invalid" as const };
    if (doc.epoch !== epoch) return { status: "reset" as const, state: toState(doc) };

    const ids = category === "all" ? allCardIds() : cardIdsInCategory(category);
    const allUsed = ids.every((id) => doc.used.includes(id));
    if (!allUsed) return { status: "not_exhausted" as const, state: toState(doc) };

    const now = Date.now();
    const used = doc.used.filter((id) => !ids.includes(id));
    await ctx.db.patch(doc._id, { used, updatedAt: now });
    return { status: "reshuffled" as const, state: { ...toState(doc), used, updatedAt: now } };
  },
});
