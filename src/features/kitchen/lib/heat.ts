import type { RecipeId, Game, Stove } from "../../../shared/types";
import { recipes } from "../../../shared/catalog";
export function quality(recipe: RecipeId, elapsed: number, target?: number) {
  const ideal = target ?? recipes[recipe].target;
  return Math.max(0, Math.round(100 - Math.abs(elapsed - ideal) * 12));
}
export function heatLabel(g: Game, s: Stove) {
  if (!s.batch) return "空闲";
  const t = g.time - s.batch.started;
  return t < s.batch.target - 2
    ? "烹饪中"
    : t <= s.batch.target + 2
      ? "最佳火候"
      : "即将焦糊";
}
