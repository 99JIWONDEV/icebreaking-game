import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getTableCount } from "./lib/config";
import { openedCountOf, resetAllBatch, resetOneTable } from "./lib/resets";

// 16: 비밀번호 없이 서버 코드/CLI(`npx convex run resets:...`, 배포 키 권한)에서만 호출할 수 있는
// 내부 함수. 클라이언트에서는 호출할 수 없다(internal). 관리자 페이지는 admin.ts의 공개 함수를 쓴다.

export const resetTable = internalMutation({
  args: { tableNo: v.number() },
  handler: async (ctx, { tableNo }) => resetOneTable(ctx, tableNo, "cli"),
});

export const resetAllTables = internalMutation({
  args: {
    runId: v.optional(v.number()),
    cursor: v.optional(v.number()),
    openedBefore: v.optional(v.number()),
    tablesReset: v.optional(v.number()),
    batchSize: v.optional(v.number()),
    via: v.optional(v.union(v.literal("admin"), v.literal("cli"))),
  },
  handler: async (ctx, args) => {
    const result = await resetAllBatch(ctx, { ...args, via: args.via ?? "cli" });
    if (!result.done) {
      await ctx.scheduler.runAfter(0, internal.resets.resetAllTables, result.next);
    }
    return { done: result.done, openedBefore: result.openedBefore, tablesReset: result.tablesReset };
  },
});

/** CLI dry-run용 읽기 전용 미리보기 — 아무것도 바꾸지 않는다. */
export const preview = internalQuery({
  args: { tableNo: v.optional(v.number()) },
  handler: async (ctx, { tableNo }) => {
    const tableCount = await getTableCount(ctx);
    const docs = await ctx.db.query("tables").take(1000);
    const targets = tableNo === undefined ? docs : docs.filter((d) => d.number === tableNo);
    return {
      configuredTableCount: tableCount,
      tableDocs: docs.length,
      targetDocs: targets.length,
      openedCards: targets.reduce((sum, d) => sum + openedCountOf(d), 0),
    };
  },
});
