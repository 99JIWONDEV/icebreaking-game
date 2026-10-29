// 03_table-sync-spec.md §9 "테스트 계획"의 동시성 항목을 실제 dev deployment에 대고 검증한다.
// `npx convex dev`가 별도 터미널에서 돌고 있어야 한다. 실행: node scripts/concurrency.ts
//
// "초기화 경합"과 "방치"는 여기 포함하지 않는다 — 전자는 ADMIN_PASSCODE가 있어야 하는데
// 그 값을 읽거나 출력하거나 파일에 쓰지 않기로 했고, 후자는 staleAfterMs(기본 10분)를
// 외부에서 줄일 수 있는 관리자 함수가 없다. 둘 다 convex/tables.test.ts에 convex-test로
// db를 직접 조작하는 단위 테스트로 대신 커버했다(관리자 인증 레이어를 우회해 CAS 로직만 검증).
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

const client = new ConvexHttpClient(loadConvexUrl());
const TEST_TABLE = 20; // 실사용(1번 등)과 안 겹치게 마지막 테이블을 쓴다

type Current = { cardId: string; openedAt: number; kind: "pick" | "random"; by: string } | null;
type TableState = { epoch: number; current: Current; used: string[] };

const QUESTIONS: { id: string }[] = questionsData.questions;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✖ ${name}`, detail ?? "");
  }
}

async function getState(): Promise<TableState> {
  const res = await client.query(anyApi.tables.get, { number: TEST_TABLE });
  if (!res.exists) throw new Error(`table ${TEST_TABLE}이 seed 안 됨 — npx convex run tables:seed 먼저 실행`);
  return res.state;
}

async function closeIfOpen() {
  const state = await getState();
  if (!state.current) return;
  const wait = Math.max(0, 2100 - (Date.now() - state.current.openedAt));
  if (wait > 0) await sleep(wait);
  await client.mutation(anyApi.tables.closeCard, {
    table: TEST_TABLE,
    cardId: state.current.cardId,
    epoch: state.epoch,
    clientId: state.current.by,
  });
}

function freshCards(n: number, usedExclude: string[]): string[] {
  const pool = QUESTIONS.map((q) => q.id).filter((id) => !usedExclude.includes(id));
  if (pool.length < n) {
    throw new Error(`테스트 테이블의 사용 가능한 카드가 부족합니다(${pool.length} < ${n}) — 테이블 ${TEST_TABLE}을 관리자 페이지에서 초기화해 주세요`);
  }
  return pool.slice(0, n);
}

async function testConcurrentOpen() {
  console.log("1) 동시 열기 — 같은 테이블에 서로 다른 카드로 20개 동시 요청");
  await closeIfOpen();
  const state = await getState();
  const cards = freshCards(20, state.used);
  const results = await Promise.all(
    cards.map((cardId) =>
      client.mutation(anyApi.tables.drawCard, { table: TEST_TABLE, cardId, epoch: state.epoch, clientId: randomUUID() }),
    ),
  );
  const opened = results.filter((r) => r.status === "opened");
  const busy = results.filter((r) => r.status === "busy");
  check("opened 정확히 1개", opened.length === 1, results.map((r) => r.status));
  check("나머지는 전부 busy", busy.length === cards.length - 1, results.map((r) => r.status));
  const after = await getState();
  check("current가 요청한 카드 중 하나로 수렴", !!after.current && cards.includes(after.current.cardId));
}

async function testDoubleTap() {
  console.log("2) 더블 탭 — 같은 clientId가 같은 카드를 동시에 2번");
  await closeIfOpen();
  const state = await getState();
  const [cardId] = freshCards(1, state.used);
  const cid = randomUUID();
  const [a, b] = await Promise.all([
    client.mutation(anyApi.tables.drawCard, { table: TEST_TABLE, cardId, epoch: state.epoch, clientId: cid }),
    client.mutation(anyApi.tables.drawCard, { table: TEST_TABLE, cardId, epoch: state.epoch, clientId: cid }),
  ]);
  check("둘 다 opened(멱등)", a.status === "opened" && b.status === "opened", [a.status, b.status]);
  const after = await getState();
  check("상태는 1회분으로 수렴", after.current?.cardId === cardId && after.current?.by === cid);
}

async function testLateClose() {
  console.log("3) 늦은 덮기 — A 열기 → A 덮기 → B 열기 → 지연된 A 덮기 재전송");
  await closeIfOpen();
  let state = await getState();
  const [cardA, cardB] = freshCards(2, state.used);
  const cidA = randomUUID();
  await client.mutation(anyApi.tables.drawCard, { table: TEST_TABLE, cardId: cardA, epoch: state.epoch, clientId: cidA });
  await sleep(2100); // minOpenMs(2000ms) 경과를 기다려야 정상적으로 덮을 수 있다
  state = await getState();
  const closeA = await client.mutation(anyApi.tables.closeCard, { table: TEST_TABLE, cardId: cardA, epoch: state.epoch, clientId: cidA });
  check("A 정상 덮기 closed", closeA.status === "closed", closeA.status);

  state = await getState();
  const cidB = randomUUID();
  const openB = await client.mutation(anyApi.tables.drawCard, { table: TEST_TABLE, cardId: cardB, epoch: state.epoch, clientId: cidB });
  check("B 열기 opened", openB.status === "opened", openB.status);

  // "늦게 도착한 이전 카드의 덮기" 재전송 시뮬레이션 — 네트워크 지연으로 늦게 도착한 것처럼
  const late = await client.mutation(anyApi.tables.closeCard, { table: TEST_TABLE, cardId: cardA, epoch: state.epoch, clientId: cidA });
  check("늦은 A 덮기는 noop", late.status === "noop", late.status);
  const after = await getState();
  check("B는 영향받지 않고 유지", after.current?.cardId === cardB);
}

async function main() {
  console.log(`concurrency.ts — table ${TEST_TABLE}에 대고 실행\n`);
  await testConcurrentOpen();
  await testDoubleTap();
  await testLateClose();
  await closeIfOpen(); // 테스트 테이블 정리
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
