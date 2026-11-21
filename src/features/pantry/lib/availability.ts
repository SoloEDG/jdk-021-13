import type { Game, RecipeId } from "../../../shared/types";
import { recipes } from "../../../shared/catalog";
import {
  grossFor,
  maxNetWeight,
  stockTotal,
} from "../../../shared/weights";

export const PREP_SLOTS = 6;

export function preparationIssue(
  g: Game,
  r: RecipeId,
  netWeight = recipes[r].baseWeight,
): string {
  if (g.portions.length >= PREP_SLOTS)
    return `备料台已满（${PREP_SLOTS}份），请先下锅或报废`;
  if (!Number.isFinite(netWeight) || netWeight <= 0)
    return "请输入有效的净料重量（克）";
  const i = recipes[r].ingredient;
  const gross = grossFor(r, netWeight);
  if (stockTotal(g, i) < gross)
    return `食材不足：需要毛料 ${gross}g，库存仅 ${stockTotal(g, i)}g`;
  return "";
}

export function maxPortionFor(g: Game, r: RecipeId) {
  return maxNetWeight(g, r);
}
