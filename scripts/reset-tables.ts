// 16: 테이블 카드 초기화 CLI — 서버 작업 확인용. 비밀번호 없이 배포 키 권한으로 internal 함수
// (convex/resets.ts)를 `npx convex run`으로 호출한다.
//
//   node scripts/reset-tables.ts --table 7            # dry-run(기본): 대상과 영향만 출력
//   node scripts/reset-tables.ts --table 7 --yes      # dev 배포에 실제 실행
//   node scripts/reset-tables.ts --all --yes
//   node scripts/reset-tables.ts --all --prod                          # prod dry-run(읽기 전용)
//   node scripts/reset-tables.ts --all --prod --yes --yes-really       # prod 실제 실행
//
// 대상 배포가 아직 convex/resets.ts를 배포받지 않았으면(`npx convex dev --once` 필요) convex run이
// "function not found"로 실패한다 — 그 경우 그대로 보여 주고 종료한다.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const has = (flag: string) => argv.includes(flag);
const valueOf = (flag: string): string | undefined => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};

function usage(code: number): never {
  console.log("사용법: node scripts/reset-tables.ts (--table <n> | --all) [--yes] [--prod --yes-really]");
  console.log("  기본은 dry-run(읽기 전용). 실제 실행은 --yes. 프로덕션 실행은 --prod --yes --yes-really 전부 필요.");
  process.exit(code);
}

const all = has("--all");
const tableRaw = valueOf("--table");
if (all === (tableRaw !== undefined)) {
  console.error("--table <n> 또는 --all 중 정확히 하나를 지정하세요.");
  usage(2);
}
let tableNo: number | undefined;
if (tableRaw !== undefined) {
  if (!/^\d{1,3}$/.test(tableRaw) || Number(tableRaw) < 1) {
    console.error(`--table 값이 올바르지 않습니다: 1 이상의 정수여야 합니다.`);
    usage(2);
  }
  tableNo = Number(tableRaw);
}

const prod = has("--prod");
const execute = has("--yes");
if (execute && prod && !has("--yes-really")) {
  console.error("프로덕션 실제 실행은 --prod --yes --yes-really 가 모두 필요합니다. 아무것도 실행하지 않았습니다.");
  process.exit(2);
}

// 대상 배포 이름 — .env.local의 CONVEX_DEPLOYMENT(dev). --prod면 Convex CLI가 prod 배포를 고른다.
function deploymentLabel(): string {
  if (prod) return "production (--prod)";
  try {
    const line = readFileSync(".env.local", "utf8")
      .split("\n")
      .find((l) => l.startsWith("CONVEX_DEPLOYMENT="));
    return line ? line.slice("CONVEX_DEPLOYMENT=".length).split("#")[0].trim() : "(.env.local에 CONVEX_DEPLOYMENT 없음)";
  } catch {
    return "(.env.local 없음)";
  }
}

function convexRun(fn: string, args: Record<string, unknown>): string {
  const cmd = ["convex", "run", fn, JSON.stringify(args), ...(prod ? ["--prod"] : [])];
  // 셸을 거치지 않는다(execFile) — 인자는 위에서 검증한 값뿐이다.
  return execFileSync("npx", cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

console.log(`대상 배포: ${deploymentLabel()}`);
console.log(`대상: ${all ? "전체 테이블" : `${tableNo}번 테이블`}  ·  모드: ${execute ? "실제 실행" : "dry-run(읽기 전용)"}`);

try {
  const preview = convexRun("resets:preview", tableNo === undefined ? {} : { tableNo });
  console.log("현재 상태(미리보기):");
  console.log(preview.trim());
  if (!execute) {
    console.log("\ndry-run이라 아무것도 바꾸지 않았습니다. 실제로 실행하려면 --yes 를 붙이세요.");
    process.exit(0);
  }
  const out = all ? convexRun("resets:resetAllTables", {}) : convexRun("resets:resetTable", { tableNo });
  console.log("\n실행 결과:");
  console.log(out.trim());
  if (all) console.log("(배치가 남았으면 서버 scheduler가 이어서 처리합니다 — adminLog에 완료 시 1건 기록)");
} catch (e) {
  const err = e as { stderr?: string; message?: string };
  console.error("\nConvex 호출 실패:");
  console.error((err.stderr ?? err.message ?? String(e)).trim().split("\n").slice(0, 6).join("\n"));
  console.error(
    "\n확인 필요: 대상 배포에 convex/resets.ts가 배포돼 있어야 합니다(`npx convex dev --once` 또는 prod 배포). " +
      "이 Mac에서 Convex에 닿지 않으면(TLS) 사용자 폰/다른 네트워크에서 확인하세요 — TLS 검증 우회는 하지 않습니다.",
  );
  process.exit(1);
}
