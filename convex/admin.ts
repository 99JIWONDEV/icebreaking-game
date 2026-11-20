import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { allCardIds } from "./lib/cards";
import { getTableCount } from "./lib/config";
import { openedCountOf, resetAllBatch, resetOneTable } from "./lib/resets";

// 16: 연속 실패 5회 → 10분 잠금. 잠금이 풀리면 실패 횟수도 0부터 다시 센다.
const LOCK_AFTER_FAILURES = 5;
const LOCK_MS = 10 * 60 * 1000;
const MIN_PASSCODE_LEN = 8;
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const RECENT_LOG_COUNT = 10;

export type AdminRejection = { status: "denied" | "locked" | "not_configured"; retryAfterMs?: number };
export type AdminCheck = { status: "ok" } | AdminRejection;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 해시(항상 64자)끼리 끝까지 비교한다 — 입력 길이가 달라도 비교 시간이 같다. */
async function passcodeMatches(input: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256Hex(input), sha256Hex(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function getAttempts(ctx: MutationCtx) {
  const doc = await ctx.db.query("adminAttempts").first();
  if (doc) return doc;
  const id = await ctx.db.insert("adminAttempts", { failedCount: 0, lockedUntil: 0 });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("adminAttempts insert failed"); // 방금 넣은 문서가 없을 수는 없다
  return created;
}

/**
 * throw하지 않고 상태 값을 반환한다 — mutation이 throw하면 트랜잭션 전체가 롤백돼
 * 실패 횟수 기록도 함께 사라지기 때문이다. passcode는 로그/에러/저장 어디에도 남기지 않는다.
 */
async function verifyPasscode(
  ctx: MutationCtx,
  passcode: string,
): Promise<AdminCheck> {
  const expected = process.env.ADMIN_PASSCODE;
  // 미설정/너무 짧음은 빈 값이나 짧은 값으로 통과하는 일이 없게 먼저 거부한다.
  if (!expected || expected.length < MIN_PASSCODE_LEN) return { status: "not_configured" };

  const attempts = await getAttempts(ctx);
  const now = Date.now();
  let failedCount = attempts.failedCount;
  if (attempts.lockedUntil > now) return { status: "locked", retryAfterMs: attempts.lockedUntil - now };
  if (attempts.lockedUntil !== 0) {
    failedCount = 0; // 잠금이 풀렸다 — 다시 5회부터
    await ctx.db.patch(attempts._id, { failedCount: 0, lockedUntil: 0 });
  }

  if (await passcodeMatches(passcode, expected)) {
    if (failedCount !== 0) await ctx.db.patch(attempts._id, { failedCount: 0, lockedUntil: 0 });
    return { status: "ok" };
  }

  failedCount += 1;
  const locking = failedCount >= LOCK_AFTER_FAILURES;
  await ctx.db.patch(attempts._id, { failedCount, lockedUntil: locking ? now + LOCK_MS : 0 });
  // 잠기는 바로 그 시도도 "denied" — 다음 시도부터 locked. 어느 쪽이 틀렸는지 단서를 주지 않는다.
  return { status: "denied" };
}

async function sessionValid(ctx: QueryCtx | MutationCtx, token: string): Promise<boolean> {
  if (token.length < 32) return false;
  const tokenHash = await sha256Hex(token);
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  // query는 Date.now()를 못 쓴다(결정성) — 만료는 scheduler가 세션 문서를 지우는 것으로 처리한다.
  return session !== null;
}

/** 로그인. 성공하면 메모리 전용 세션 토큰을 돌려준다(저장은 해시만, 4시간 뒤 자동 삭제). */
export const checkPasscode = mutation({
  args: { passcode: v.string() },
  handler: async (ctx, { passcode }) => {
    const check = await verifyPasscode(ctx, passcode);
    if (check.status !== "ok") return check;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const session = await ctx.db.insert("adminSessions", {
      tokenHash: await sha256Hex(token),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    await ctx.scheduler.runAfter(SESSION_TTL_MS, internal.admin.expireSession, { session });
    return { status: "ok" as const, token };
  },
});

export const expireSession = internalMutation({
  args: { session: v.id("adminSessions") },
  handler: async (ctx, { session }) => {
    if (await ctx.db.get(session)) await ctx.db.delete(session);
  },
});

export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (token.length < 32) return { status: "ok" as const };
    const tokenHash = await sha256Hex(token);
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) await ctx.db.delete(session._id);
    return { status: "ok" as const };
  },
});

/**
 * 모든 테이블의 열린 카드 수. reactive라 목록이 실시간으로 갱신된다. 실패 횟수를 못 세는
 * query라 passcode 대신 로그인이 발급한 토큰으로 인증한다(잠금 우회 방지).
 */
export const listTables = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!(await sessionValid(ctx, token))) return { status: "denied" as const };
    const tableCount = await getTableCount(ctx);
    const docs = await ctx.db.query("tables").take(tableCount + 100);
    const byNumber = new Map(docs.map((d) => [d.number, d]));
    const tables = Array.from({ length: tableCount }, (_, i) => {
      const tableNo = i + 1;
      const doc = byNumber.get(tableNo);
      return {
        tableNo,
        openedCount: doc ? openedCountOf(doc) : 0, // 문서가 없는 테이블(seed 전)은 0장
        epoch: doc?.epoch ?? 0,
        updatedAt: doc?.updatedAt ?? null,
      };
    });
    return { status: "ok" as const, tables, total: allCardIds().length };
  },
});

export const recentLog = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!(await sessionValid(ctx, token))) return { status: "denied" as const };
    const rows = await ctx.db.query("adminLog").order("desc").take(RECENT_LOG_COUNT);
    return {
      status: "ok" as const,
      rows: rows.map((r) => ({
        id: r._id,
        at: r.at,
        action: r.action,
        tableNo: r.tableNo ?? null,
        openedBefore: r.openedBefore,
        tablesReset: r.tablesReset ?? null,
        via: r.via,
      })),
    };
  },
});

export const resetTable = mutation({
  args: { passcode: v.string(), tableNo: v.number() },
  handler: async (ctx, { passcode, tableNo }) => {
    const check = await verifyPasscode(ctx, passcode);
    if (check.status !== "ok") return check;
    const result = await resetOneTable(ctx, tableNo, "admin");
    return result;
  },
});

/** 한 배치만 여기서 처리하고, 남으면 scheduler로 이어 간다(중간에 멈춰도 같은 runId로 이어짐). */
export const resetAllTables = mutation({
  args: { passcode: v.string() },
  handler: async (ctx, { passcode }) => {
    const check = await verifyPasscode(ctx, passcode);
    if (check.status !== "ok") return check;
    const result = await resetAllBatch(ctx, { via: "admin" });
    if (!result.done) {
      await ctx.scheduler.runAfter(0, internal.resets.resetAllTables, result.next);
    }
    return { status: "ok" as const, done: result.done, tablesReset: result.tablesReset, openedBefore: result.openedBefore };
  },
});

export const forceClose = mutation({
  args: { table: v.number(), passcode: v.string() },
  handler: async (ctx, { table, passcode }) => {
    const check = await verifyPasscode(ctx, passcode);
    if (check.status !== "ok") return check;
    const doc = await ctx.db
      .query("tables")
      .withIndex("by_number", (q) => q.eq("number", table))
      .unique();
    if (!doc) return { status: "invalid" as const };
    if (!doc.current) return { status: "ok" as const };
    const used = [...doc.used, doc.current.cardId];
    await ctx.db.patch(doc._id, { current: null, used, updatedAt: Date.now() });
    return { status: "ok" as const };
  },
});
