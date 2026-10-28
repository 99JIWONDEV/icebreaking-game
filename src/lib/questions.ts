import data from "@/data/questions.json";

export type Category = { id: string; ko: string; en: string };
export type Question = { id: string; category: string; ko: string; en: string };

export const categories: Category[] = data.categories;
export const questions: Question[] = data.questions;

export const validCardIds: ReadonlySet<string> = new Set(questions.map((q) => q.id));

export function isValidCardId(cardId: string): boolean {
  return validCardIds.has(cardId);
}

export function questionById(cardId: string): Question | undefined {
  return questions.find((q) => q.id === cardId);
}

export function categoryOf(question: Question): Category {
  return categories.find((c) => c.id === question.category) ?? categories[0];
}

/** Fixed number 01..55, following category order — never implies question content. */
export function questionIndex(question: Question): number {
  return questions.findIndex((q) => q.id === question.id) + 1;
}

export function questionsInCategory(category: string | "all"): Question[] {
  return category === "all" ? questions : questions.filter((q) => q.category === category);
}

export function cardIdsInCategory(category: string | "all"): string[] {
  return questionsInCategory(category).map((q) => q.id);
}
