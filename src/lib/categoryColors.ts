/** Category id → the CSS custom property holding its "Harvest" back color. */
const CATEGORY_COLOR_VAR: Record<string, string> = {
  warmup: "--color-cat-warmup",
  me: "--color-cat-me",
  memories: "--color-cat-memories",
  whatif: "--color-cat-whatif",
  faith: "--color-cat-faith",
  together: "--color-cat-together",
};

export function categoryColorVar(categoryId: string): string {
  return `var(${CATEGORY_COLOR_VAR[categoryId] ?? "--color-fill"})`;
}
