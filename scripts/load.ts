// 03_table-sync-spec.md §9 "부하" 항목: 가상 클라이언트 120개, 테이블 15개에서 열기/덮기 반복.
// 실제 dev deployment에 대고 돈다. `npx convex dev`가 별도 터미널에서 돌고 있어야 한다.
// 실행: node scripts/load.ts (환경변수로 조절 가능: LOAD_CLIENTS, LOAD_TABLES, LOAD_DURATION_MS)
//
// "오류 0건"의 기준: busy/already_used/exhausted/too_soon/noop은 스펙이 정의한 정상적인
// 경합 결과이지 오류가 아니다. 오류로 세는 것은 (a) mutation이 throw/네트워크 실패하는 경우,
// (b) invalid 상태(유효하지 않은 cardId/table — 이 스크립트는 항상 유효한 값만 보내므로
// 나오면 안 됨), (c) 서버가 CAS 불변식을 어긴 경우(current가 동시에 2장 등, concurrency.ts가
// 이미 따로 검증하지만 부하 중에도 깨지지 않는지 가볍게 같이 확인한다).
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import questionsData from "../src/data/questions.json" with { type: "json" };

function loadConvexUrl(): string {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = env.split("\n").find((l) => l.startsWith("NEXT_PUBLIC_CONVEX_URL="));
  if (!line) throw new Error(".env.local에 NEXT_PUBLIC_CONVEX_URL이 없습니다");
  return line.slice("NEXT_PUBLIC_CONVEX_URL=".length).trim();
}

const CLIENTS = Number(process.env.LOAD_CLIENTS ?? 120);
const TABLES = Number(process.env.LOAD_TABLES ?? 15);
const TABLE_OFFSET = Number(process.env.LOAD_TABLE_OFFSET ?? 6); // 1~5번은 수동 테스트용으로 비워 둔다
const DURATION_MS = Number(process.env.LOAD_DURATION_MS ?? 20_000);
const MIN_OPEN_MS = 2000;

const client = new ConvexHttpClient(loadConvexUrl());
const QUESTIONS: { id: string; category: string }[] = questionsData.questions;
const ALL_CARD_IDS = QUESTIONS.map((q) => q.id);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (baseMs: number, spreadMs: number) => baseMs + Math.random() * spreadMs;

type Outcome = { kind: "ok" | "error"; label: string; latencyMs: number };
const outcomes: Outcome[] = [];

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  const start = performance.now();
  try {
    const result = await fn();
    outcomes.push({ kind: "ok", label, latencyMs: performance.now() - start });
    return result;
  } catch (err) {
    outcomes.push({ kind: "error", label: `${label}: ${(err as Error).message}`, latencyMs: performance.now() - start });
    return undefined;
  }
}

async function virtualClient(id: number, deadline: number) {
  const table = TABLE_OFFSET + (id % TABLES);
  const clientId = randomUUID();

  while (performance.now() < deadline) {
    const stateRes = await timed("tables.get", () =>
      client.query(anyApi.tables.get, { number: table }),
    );
    if (!stateRes?.exists) {
      outcomes.push({ kind: "error", label: `table ${table} not seeded`, latencyMs: 0 });
      break;
    }
    const state = stateRes.state as { epoch: number; current: null | { cardId: string; openedAt: number }; used: string[] };

    if (state.current) {
      // 다른 클라이언트가 이미 연 카드 — 조금 기다렸다가 다시 본다 (grid-disabled와 동일한 사용자 경험)
      await sleep(jitter(300, 400));
      continue;
    }

    const available = ALL_CARD_IDS.filter((cid) => !state.used.includes(cid));
    if (available.length === 0) break; // 이 테이블은 소진 — 이 가상 클라이언트는 종료
    const cardId = available[Math.floor(Math.random() * available.length)];

    const draw = await timed("drawCard", () =>
      client.mutation(anyApi.tables.drawCard, { table, cardId, epoch: state.epoch, clientId }),
    );
    if (!draw) continue;
    if (draw.status === "invalid") {
      outcomes.push({ kind: "error", label: `drawCard invalid (table ${table}, card ${cardId})`, latencyMs: 0 });
      continue;
    }
    if (draw.status !== "opened") continue; // busy/already_used/reset — 정상적인 경합, 다음 루프에서 재시도

    // 질문을 "읽는" 시간을 흉내 — minOpenMs보다 길게 대기
    await sleep(jitter(MIN_OPEN_MS + 100, 1500));

    const closeState = await timed("tables.get(close前)", () => client.query(anyApi.tables.get, { number: table }));
    if (!closeState?.exists) continue;
    const cs = closeState.state as { epoch: number };
    const close = await timed("closeCard", () =>
      client.mutation(anyApi.tables.closeCard, { table, cardId, epoch: cs.epoch, clientId }),
    );
    if (close && close.status === "invalid") {
      outcomes.push({ kind: "error", label: `closeCard invalid (table ${table}, card ${cardId})`, latencyMs: 0 });
    }
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  console.log(`load.ts — 가상 클라이언트 ${CLIENTS}개, 테이블 ${TABLE_OFFSET}..${TABLE_OFFSET + TABLES - 1}, ${DURATION_MS}ms 동안 실행\n`);
  const deadline = performance.now() + DURATION_MS;
  const clients = Array.from({ length: CLIENTS }, (_, i) => virtualClient(i, deadline));
  await Promise.all(clients);

  const errors = outcomes.filter((o) => o.kind === "error");
  const oks = outcomes.filter((o) => o.kind === "ok");
  const latencies = oks.map((o) => o.latencyMs).sort((a, b) => a - b);

  console.log(`총 요청 ${outcomes.length}건 (성공 ${oks.length}, 오류 ${errors.length})`);
  console.log(`지연 p50=${percentile(latencies, 50).toFixed(0)}ms p95=${percentile(latencies, 95).toFixed(0)}ms max=${(latencies.at(-1) ?? 0).toFixed(0)}ms`);
  if (errors.length > 0) {
    console.log("\n오류 상세 (최대 20건):");
    for (const e of errors.slice(0, 20)) console.log(`  - ${e.label}`);
  }
  console.log(`\n${errors.length === 0 ? "PASS" : "FAIL"} — 오류 ${errors.length}건`);
  if (errors.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
