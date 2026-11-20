import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

// Convex 공식 한도(docs.convex.dev/production/state/limits, 16 확인): 한 트랜잭션에서
// 문서 16,000개 쓰기 / 32,000개 스캔 / 16 MiB. 200개씩이면 그 1.25%라 한참 여유가 있다.
export const RESET_BATCH_SIZE = 200;

export type Via = "admin" | "cli";

export function openedCountOf(doc: Pick<Doc<"tables">, "used" | "current">): number {
  return doc.used.length + (doc.current ? 1 : 0);
}

async function findTable(ctx: MutationCtx, tableNo: number) {
  return ctx.db
    .query("tables")
    .withIndex("by_number", (q) => q.eq("number", tableNo))
    .unique();
}

/** 테이블 하나를 초기 상태로: 열린 카드 비우기 + epoch+1. 문서는 지우지 않는다 — 지우면
 *  접속 중인 폰은 exists:false를 받아 상태를 못 갱신하고(ConvexRepository.pushState),
 *  seed를 다시 돌려야 하기 때문. 같은 문서의 epoch만 올리면 기존 규칙대로 "reset"으로 처리된다. */
export async function resetOneTable(ctx: MutationCtx, tableNo: number, via: Via) {
  const doc = await findTable(ctx, tableNo);
  if (!doc) return { status: "invalid" as const };
  const openedBefore = openedCountOf(doc);
  const now = Date.now();
  await ctx.db.patch(doc._id, { epoch: doc.epoch + 1, current: null, used: [], updatedAt: now });
  await ctx.db.insert("adminLog", { at: now, action: "reset_table", tableNo, openedBefore, via });
  return { status: "ok" as const, openedBefore };
}

export type ResetAllArgs = {
  runId?: number;
  cursor?: number;
  openedBefore?: number;
  tablesReset?: number;
  batchSize?: number;
  via: Via;
};

export type ResetAllNext = Required<Pick<ResetAllArgs, "runId" | "cursor" | "openedBefore" | "tablesReset" | "via">> & {
  batchSize?: number;
};

/**
 * 한 배치만 처리한다. 배치가 가득 찼으면 `next`를 돌려주고, 호출자가 scheduler로 이어 간다.
 * 멱등: 문서에 lastResetRun === runId가 있으면 이미 이 실행에서 처리한 것이라 건너뛴다 —
 * 중간에 멈춰도 같은 runId로 다시 실행하면 이어진다(epoch가 두 번 오르지 않는다).
 * 마지막 배치에서 감사 로그를 1건 남긴다(누적 합).
 */
export async function resetAllBatch(ctx: MutationCtx, args: ResetAllArgs) {
  const now = Date.now();
  const runId = args.runId ?? now;
  const cursor = args.cursor ?? 0;
  const batchSize = args.batchSize ?? RESET_BATCH_SIZE;
  let openedBefore = args.openedBefore ?? 0;
  let tablesReset = args.tablesReset ?? 0;

  const docs = await ctx.db
    .query("tables")
    .withIndex("by_number", (q) => q.gt("number", cursor))
    .take(batchSize);

  for (const doc of docs) {
    if (doc.lastResetRun === runId) continue;
    openedBefore += openedCountOf(doc);
    tablesReset += 1;
    await ctx.db.patch(doc._id, {
      epoch: doc.epoch + 1,
      current: null,
      used: [],
      updatedAt: now,
      lastResetRun: runId,
    });
  }

  if (docs.length === batchSize) {
    const next: ResetAllNext = {
      runId,
      cursor: docs[docs.length - 1].number,
      openedBefore,
      tablesReset,
      via: args.via,
      batchSize: args.batchSize,
    };
    return { done: false as const, next, openedBefore, tablesReset };
  }

  await ctx.db.insert("adminLog", { at: now, action: "reset_all", openedBefore, tablesReset, via: args.via });
  return { done: true as const, openedBefore, tablesReset };
}
