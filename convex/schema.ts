import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// 03_table-sync-spec.md §2의 모델 그대로.
export default defineSchema({
  tables: defineTable({
    number: v.number(),
    epoch: v.number(),
    current: v.union(
      v.null(),
      v.object({
        cardId: v.string(),
        openedAt: v.number(),
        kind: v.union(v.literal("pick"), v.literal("random")),
        by: v.string(),
      }),
    ),
    used: v.array(v.string()),
    updatedAt: v.number(),
  }).index("by_number", ["number"]),

  // 전역 설정 1개 문서. 없으면 tables.ts의 DEFAULT_CONFIG를 쓴다.
  config: defineTable({
    tableCount: v.number(),
    minOpenMs: v.number(),
    staleAfterMs: v.number(),
  }),

  // 관리자 비밀번호 실패 횟수/잠금 1개 문서.
  adminAttempts: defineTable({
    failedCount: v.number(),
    lockedUntil: v.number(),
  }),
});
