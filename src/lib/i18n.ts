import type { LanguageMode } from "@/store/useViewStore";

export const languageOptions: { mode: LanguageMode; label: string }[] = [
  { mode: "ko", label: "한국어" },
  { mode: "en", label: "English" },
  { mode: "both", label: "둘 다" },
];

/** ko/en(/both) 조합 — 둘 다 모드는 "ko · en" 형태로 합친다. */
export function pick(mode: LanguageMode, ko: string, en: string): string {
  if (mode === "ko") return ko;
  if (mode === "en") return en;
  return `${ko} · ${en}`;
}

export function sourceLabel(mode: LanguageMode, category: { ko: string; en: string }): string {
  return pick(mode, category.ko, category.en);
}

export const intro = {
  ko: "깊은 교제를 위한 질문 카드",
  en: "Questions for deeper fellowship",
};

export const tableEntry = {
  join: { ko: "입장하기", en: "Join" },
  error: (max: number) => ({
    ko: `1~${max} 사이로 입력해 주세요`,
    en: `Enter 1–${max}`,
  }),
};

export const tableNumberLabel = { ko: "테이블 번호", en: "Table number" };
export const tableNumberPlaceholder = { ko: "예: 7", en: "e.g. 7" };

export const topBar = {
  menuLabel: { ko: "메뉴 열기", en: "Open menu" },
  table: (n: number) => ({ ko: `${n}번 테이블`, en: `Table ${n}` }),
  connection: {
    connected: { ko: "연결됨", en: "Connected" },
    reconnecting: { ko: "다시 연결하는 중", en: "Reconnecting" },
    offline: { ko: "연결 끊김", en: "Offline" },
  },
  offlineBanner: { ko: "연결이 끊겼어요. 다시 연결하는 중", en: "Connection lost. Reconnecting" },
};

export const progress = (used: number, total: number) => ({
  ko: `${used}/${total}장 열었어요`,
  en: `${used}/${total} opened`,
});

export const drawRandom = { ko: "랜덤으로 뽑기", en: "Draw at random" };

export const cardBack = {
  closed: (n: number, category: { ko: string; en: string }) => ({
    ko: `${n}번 카드, ${category.ko}`,
    en: `Card ${n}, ${category.en}`,
  }),
  used: (n: number, category: { ko: string; en: string }) => ({
    ko: `${n}번 카드, ${category.ko} (사용함)`,
    en: `Card ${n}, ${category.en} (used)`,
  }),
};

export const closeCard = { ko: "카드 덮기", en: "Close card" };

export const categoryExhausted = {
  message: { ko: "이 카테고리 카드를 모두 열었어요", en: "You've opened every card in this category" },
  reshuffle: { ko: "다시 섞기", en: "Reshuffle" },
};

export const menu = {
  title: { ko: "메뉴", en: "Menu" },
  category: { ko: "카테고리", en: "Category" },
  all: { ko: "전체", en: "All" },
  table: { ko: "테이블", en: "Table" },
  changeTable: { ko: "테이블 변경", en: "Change table" },
  confirmTable: (n: number) => ({ ko: `${n}번 테이블로 이동할까요?`, en: `Move to table ${n}?` }),
  confirm: { ko: "확인", en: "Confirm" },
  cancel: { ko: "취소", en: "Cancel" },
  language: { ko: "언어", en: "Language" },
};

export const localFallback = {
  prompt: { ko: "이 기기에서만 진행할 수 있어요", en: "You can continue on this device only" },
  backToServer: { ko: "서버로 돌아가기", en: "Back to server" },
};

export const liveMessages = {
  cardOpenedByOther: { ko: "방금 다른 분이 카드를 열었어요", en: "Someone just opened a card" },
  cardClosed: { ko: "카드가 덮였어요", en: "Card closed" },
  tableReset: { ko: "진행자가 이 테이블을 처음으로 되돌렸어요", en: "The host reset this table." },
};
