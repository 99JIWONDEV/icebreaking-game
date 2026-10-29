// 단일 출처: src/data/questions.json. 서버는 카드 ID와 카테고리 소속만 안다 — 질문
// 본문은 두지 않는다 (스펙 §3-2). 카드 ID는 절대 바꾸거나 재번호하지 않는다.
import data from "../../src/data/questions.json";

type Question = { id: string; category: string; ko: string; en: string };
type Category = { id: string; ko: string; en: string };

const questions: Question[] = data.questions;
const categories: Category[] = data.categories;

export const VALID_CARD_IDS: ReadonlySet<string> = new Set(questions.map((q) => q.id));
export const CATEGORY_IDS: ReadonlySet<string> = new Set(categories.map((c) => c.id));

export function isValidCardId(cardId: string): boolean {
  return VALID_CARD_IDS.has(cardId);
}

export function allCardIds(): string[] {
  return questions.map((q) => q.id);
}

export function cardIdsInCategory(categoryId: string): string[] {
  return questions.filter((q) => q.category === categoryId).map((q) => q.id);
}
