import { categories, questions, type Category, type Question } from "@/lib/questions";

export type CategorySection = {
  category: Category;
  /** 1-based, questions.json 배열 순서(questionIndex와 동일 기준) */
  start: number;
  end: number;
  questions: Question[];
};

/**
 * 카테고리별 번호 구간을 `questions.json`에서 계산한다(스펙 §4-1 — 하드코딩 금지).
 * 카테고리는 배열 안에서 **연속 블록**이라고 가정한다(현재 데이터로 확인됨 — 가볍게 시작
 * 1~10, 나를 소개해요 11~20 … 함께 48~55). 블록이 끊기면(같은 카테고리가 두 번 등장하면)
 * start~end가 실제 분포와 어긋날 수 있으니, questions.json 순서를 바꿀 땐 주의한다.
 */
export function categorySections(): CategorySection[] {
  return categories.map((category) => {
    const firstIndex = questions.findIndex((q) => q.category === category.id);
    const lastIndex = questions.length - 1 - [...questions].reverse().findIndex((q) => q.category === category.id);
    return {
      category,
      start: firstIndex + 1,
      end: lastIndex + 1,
      questions: questions.slice(firstIndex, lastIndex + 1),
    };
  });
}
