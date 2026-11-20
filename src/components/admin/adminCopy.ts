// 관리자 페이지 문구 — 한국어 · English 항상 병기(관리자는 언어 전환 설정과 무관하게 같은 화면).
export const copy = {
  title: "관리자 · Admin",
  signOut: "나가기 · Sign out",
  passcodeLabel: "관리자 비밀번호 · Admin passcode",
  confirm: "확인 · Confirm",
  localOnly: "서버 모드에서만 사용할 수 있습니다 · Available in server mode only",
  localOnlyHint: "Convex 서버에 연결된 상태에서 ?local=1 없이 여세요 · Open without ?local=1 while connected to the server",
  expiredSession: "세션이 끝났어요. 다시 로그인해 주세요 · Session ended. Please sign in again",
  denied: "비밀번호가 올바르지 않습니다 · Incorrect passcode",
  notConfigured: "관리자 기능이 설정되지 않았습니다 · Admin is not configured",
  failed: "요청에 실패했어요. 연결을 확인해 주세요 · Request failed. Check your connection",
  lockedPrefix: "시도 횟수를 넘었습니다",
  loading: "불러오는 중 · Loading",
  tableGridLabel: "테이블 목록 · Tables",
  resetTable: (n: number) => `선택한 테이블 초기화 · Reset table ${n}`,
  resetTableNone: "선택한 테이블 초기화 · Reset table",
  resetAll: "전체 테이블 초기화 · Reset all tables",
  cancel: "취소 · Cancel",
  reset: "초기화 · Reset",
  running: "초기화하는 중 · Resetting",
  auditLog: "감사 로그 · Audit log",
  auditEmpty: "기록이 없습니다 · No entries",
  confirmWord: "전체",
  typeToConfirm: "계속하려면 “전체”를 입력하세요 · Type “전체” to continue",
};

export function lockedMessage(retryAfterMs: number): string {
  const min = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  return `${copy.lockedPrefix}. ${min}분 뒤에 다시 시도하세요 · Too many attempts. Try again in ${min} min`;
}

export function singleConfirmText(tableNo: number, opened: number) {
  return {
    ko: `${tableNo}번 테이블의 열린 카드 ${opened}장을 처음 상태로 되돌립니다. 되돌릴 수 없습니다.`,
    en: `Reset table ${tableNo} (${opened} opened cards) to its initial state. This cannot be undone.`,
  };
}

export function allConfirmText(tables: number, opened: number) {
  return {
    ko: `전체 ${tables}개 테이블, 열린 카드 총 ${opened}장을 처음 상태로 되돌립니다. 되돌릴 수 없습니다.`,
    en: `Reset all ${tables} tables (${opened} opened cards in total). This cannot be undone.`,
  };
}

export function resetDone(tableNo: number | null, tables: number): string {
  return tableNo === null
    ? `전체 ${tables}개 테이블을 초기화했어요 · Reset all ${tables} tables`
    : `${tableNo}번 테이블을 초기화했어요 · Reset table ${tableNo}`;
}
