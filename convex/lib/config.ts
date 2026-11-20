import type { MutationCtx, QueryCtx } from "../_generated/server";

// tables.ts의 DEFAULT_CONFIG.tableCount(20)와 같아야 한다 — tables.ts를 건드리지 않으려고
// (16: 기존 동기화 규칙은 바꾸지 않는다) 같은 규칙을 여기서 따로 읽는다. config 문서가 있으면 그 값.
export const DEFAULT_TABLE_COUNT = 20;
const MAX_TABLE_COUNT = 500; // 비정상 config 값이 관리자 쿼리를 무한정 키우지 않게 하는 상한

export async function getTableCount(ctx: QueryCtx | MutationCtx): Promise<number> {
  const doc = await ctx.db.query("config").first();
  return Math.min(doc?.tableCount ?? DEFAULT_TABLE_COUNT, MAX_TABLE_COUNT);
}
