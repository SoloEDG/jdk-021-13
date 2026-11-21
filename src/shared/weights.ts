import type {
  Game,
  Ingredient,
  PortionSize,
  RecipeId,
  StationKind,
} from "./types";
import { recipes, ingredients, costPerGram } from "./catalog";

export const PORTION_SIZES: PortionSize[] = ["small", "regular", "double"];

export const sizeSpecs: Record<
  PortionSize,
  { label: string; hint: string; weightFactor: number; priceFactor: number }
> = {
  small: { label: "小份", hint: "省料", weightFactor: 0.65, priceFactor: 0.65 },
  regular: {
    label: "标准份",
    hint: "常规",
    weightFactor: 1,
    priceFactor: 1,
  },
  double: { label: "双份", hint: "加量", weightFactor: 1.7, priceFactor: 1.9 },
};

/** 一口锅最多能同时处理的净料重量。 */
export const STOVE_CAPACITY = 700;

export function requiredWeight(r: RecipeId, size: PortionSize) {
  return Math.round(recipes[r].baseWeight * sizeSpecs[size].weightFactor);
}

export function orderQuote(r: RecipeId, size: PortionSize) {
  return Math.round(recipes[r].price * sizeSpecs[size].priceFactor);
}

export function trimFor(r: RecipeId, netWeight: number) {
  return Math.round(netWeight * ingredients[recipes[r].ingredient].trimRate);
}

/** 产出 netWeight 净料需要从库存里取走的毛料重量。 */
export function grossFor(r: RecipeId, netWeight: number) {
  return netWeight + trimFor(r, netWeight);
}

/**
 * 一锅的总重量不同，所需火候也不同：
 * 标准份耗时最长，小份更快，双份和合做更久但摊到每份仍更省时间。
 */
export function batchTarget(r: RecipeId, totalWeight: number) {
  const base = recipes[r];
  const ratio = Math.max(0.1, totalWeight / base.baseWeight);
  return Math.round(base.target * (0.55 + 0.45 * ratio) * 10) / 10;
}

export function stockTotal(g: Game, i: Ingredient) {
  return g.stock[i].sealed + g.stock[i].open;
}

/** 在现有库存下最多能切出的净料重量。 */
export function maxNetWeight(g: Game, r: RecipeId) {
  const i = recipes[r].ingredient;
  const total = stockTotal(g, i);
  let w = Math.floor(total / (1 + ingredients[i].trimRate));
  while (w > 0 && grossFor(r, w) > total) w--;
  return w;
}

export function stoveCapacity(_kind?: StationKind) {
  return STOVE_CAPACITY;
}

export function dishValue(weight: number, i: Ingredient) {
  return weight * costPerGram(i);
}

export function formatGrams(n: number) {
  return `${Math.round(n)}g`;
}

export function formatTime(n: number) {
  return `${Math.round(n * 10) / 10} 秒`;
}
