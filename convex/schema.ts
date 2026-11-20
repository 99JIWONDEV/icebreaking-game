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
    // 16: resetAllTables 한 번의 실행 ID. 배치 중간에 멈췄다 다시 실행해도 이미 처리한 문서를
    // 건너뛰어(epoch가 두 번 오르지 않게) 이어서 처리한다. optional이라 기존 문서와 호환.
    lastResetRun: v.optional(v.number()),
  }).index("by_number", ["number"]),

  // 전역 설정 1개 문서. 없으면 tables.ts의 DEFAULT_CONFIG를 쓴다.
  config: defineTable({
    tableCount: v.number(),
    minOpenMs: v.number(),
    staleAfterMs: v.number(),
  }),

  // 16: 관리자 감사 로그. passcode 값은 절대 저장하지 않는다.
  adminLog: defineTable({
    at: v.number(),
    action: v.union(v.literal("reset_table"), v.literal("reset_all")),
    tableNo: v.optional(v.number()), // reset_all이면 없음
    openedBefore: v.number(), // 초기화 직전 열린 카드 수(used + current). reset_all이면 전체 합
    tablesReset: v.optional(v.number()), // reset_all이면 초기화한 테이블 수
    via: v.union(v.literal("admin"), v.literal("cli")),
  }),

  // 16: 로그인 성공 시 발급하는 세션. listTables 같은 reactive query는 실패 횟수를 기록할 수 없어
  // passcode를 직접 받으면 잠금을 우회하는 추측 경로가 된다 — 그래서 query는 이 토큰(해시만 저장)으로 인증한다.
  adminSessions: defineTable({
    tokenHash: v.string(),
    expiresAt: v.number(),
  }).index("by_hash", ["tokenHash"]),

  // 관리자 비밀번호 실패 횟수/잠금 1개 문서.
  adminAttempts: defineTable({
    failedCount: v.number(),
    lockedUntil: v.number(),
  }),
});
