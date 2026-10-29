import { mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";

// 실패 5회부터 점점 길어지는 잠금 (30초 → 1분 → 5분, 이후 5분 유지).
const LOCK_STEPS_MS = [30_000, 60_000, 300_000] as const;
const LOCK_AFTER_FAILURES = 5;

type AdminCheck = "ok" | "denied" | "locked" | "not_configured";

async function getAttempts(ctx: MutationCtx) {
  const doc = await ctx.db.query("adminAttempts").first();
  if (doc) return doc;
  const id = await ctx.db.insert("adminAttempts", { failedCount: 0, lockedUntil: 0 });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("adminAttempts insert failed"); // 방금 넣은 문서가 없을 수는 없다
  return created;
}

/** 길이가 달라도 타이밍이 새지 않게 끝까지 비교한다 — 비밀번호 비교는 Node의 crypto를
 *  쓸 수 없는 Convex 런타임(mutation)에서 돌아가므로 직접 구현한다. */
function timingSafeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

/**
 * throw하지 않고 상태 값을 반환한다 — mutation이 throw하면 트랜잭션 전체가 롤백돼
 * 실패 횟수 기록도 함께 사라지기 때문이다 (spec Part B §3-5).
 */
async function checkPasscode(ctx: MutationCtx, passcode: string): Promise<AdminCheck> {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) return "not_configured";

  const attempts = await getAttempts(ctx);
  const now = Date.now();
  if (attempts.lockedUntil > now) return "locked";

  if (timingSafeEqual(passcode, expected)) {
    if (attempts.failedCount !== 0 || attempts.lockedUntil !== 0) {
      await ctx.db.patch(attempts._id, { failedCount: 0, lockedUntil: 0 });
    }
    return "ok";
  }

  const failedCount = attempts.failedCount + 1;
  const lockedUntil =
    failedCount >= LOCK_AFTER_FAILURES
      ? now + LOCK_STEPS_MS[Math.min(failedCount - LOCK_AFTER_FAILURES, LOCK_STEPS_MS.length - 1)]
      : 0;
  await ctx.db.patch(attempts._id, { failedCount, lockedUntil });
  return "denied";
}

async function findTable(ctx: MutationCtx, number: number) {
  return ctx.db
    .query("tables")
    .withIndex("by_number", (q) => q.eq("number", number))
    .unique();
}

export const resetTable = mutation({
  args: { table: v.number(), passcode: v.string() },
  handler: async (ctx, { table, passcode }) => {
    const check = await checkPasscode(ctx, passcode);
    if (check !== "ok") return { status: check };
    const doc = await findTable(ctx, table);
    if (!doc) return { status: "invalid" as const };
    await ctx.db.patch(doc._id, { epoch: doc.epoch + 1, current: null, used: [], updatedAt: Date.now() });
    return { status: "ok" as const };
  },
});

export const forceClose = mutation({
  args: { table: v.number(), passcode: v.string() },
  handler: async (ctx, { table, passcode }) => {
    const check = await checkPasscode(ctx, passcode);
    if (check !== "ok") return { status: check };
    const doc = await findTable(ctx, table);
    if (!doc) return { status: "invalid" as const };
    if (!doc.current) return { status: "ok" as const };
    const used = [...doc.used, doc.current.cardId];
    await ctx.db.patch(doc._id, { current: null, used, updatedAt: Date.now() });
    return { status: "ok" as const };
  },
});

export const resetAll = mutation({
  args: { passcode: v.string(), confirm: v.string() },
  handler: async (ctx, { passcode, confirm }) => {
    const check = await checkPasscode(ctx, passcode);
    if (check !== "ok") return { status: check };
    if (confirm !== "RESET") return { status: "denied" as const };
    const tables = await ctx.db.query("tables").collect();
    const now = Date.now();
    for (const doc of tables) {
      await ctx.db.patch(doc._id, { epoch: doc.epoch + 1, current: null, used: [], updatedAt: now });
    }
    return { status: "ok" as const, count: tables.length };
  },
});
