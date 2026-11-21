import type { Game, RecipeId, Ingredient } from "../../../shared/types";
import { recipes, ingredients } from "../../../shared/catalog";
import {
  grossFor,
  trimFor,
  stockTotal,
  formatGrams,
} from "../../../shared/weights";
import { preparationIssue } from "../lib/availability";
import { recordDisposal } from "../../ledger/lib/balance";

/** 从已开封散料优先取料，不足时拆新包。 */
function takeStock(g: Game, i: Ingredient, gross: number) {
  const s = g.stock[i];
  const fromOpen = Math.min(s.open, gross);
  s.open -= fromOpen;
  let rest = gross - fromOpen;
  while (rest > 0) {
    const pack = ingredients[i].packWeight;
    const take = Math.min(pack, rest);
    s.sealed -= pack;
    // 新包一次用不完的部分转入散料，避免凭空蒸发。
    s.open += pack - take;
    rest -= take;
  }
  if (s.sealed < 0) s.sealed = 0;
}

export function prepare(g: Game, r: RecipeId, weight: number) {
  const net = Math.round(weight);
  const issue = preparationIssue(g, r, net);
  if (issue) {
    g.notice = issue;
    return;
  }
  const i = recipes[r].ingredient;
  const trim = trimFor(r, net);
  takeStock(g, i, grossFor(r, net));
  // 切配产生的边角料立即计损耗，不再回到库存。
  recordDisposal(g, {
    ingredient: i,
    recipe: r,
    weight: trim,
    reason: "trim",
    source: `切配${recipes[r].name}`,
  });
  g.portions.push({
    id: g.nextId++,
    recipe: r,
    weight: net,
    preparedAt: g.time,
    trim,
  });
  g.notice = `${recipes[r].name} 切出 ${formatGrams(net)} 净料，修整边角 ${formatGrams(trim)} 计损耗`;
}

export function restock(g: Game, i: Ingredient) {
  const cap = ingredients[i].packWeight * 4;
  if (stockTotal(g, i) + ingredients[i].packWeight > cap) {
    g.notice = `库存充足，上限 ${cap}g 毛料`;
    return;
  }
  g.stock[i].sealed += ingredients[i].packWeight;
  g.receivedWeight[i] += ingredients[i].packWeight;
  g.entries.push({
    id: g.nextId++,
    time: g.time,
    label: `采购${ingredients[i].name} 1包 ${formatGrams(ingredients[i].packWeight)}`,
    amount: -ingredients[i].packCost,
    kind: "supply",
    weight: ingredients[i].packWeight,
  });
  g.notice = `已购入 1 包${ingredients[i].name}（${formatGrams(ingredients[i].packWeight)}），费用计入账本`;
}

/**
 * 把两份同配方净料合并成一份。合并后仍是「已切净料」，
 * 只能继续下锅或报废，绝不能变回未开封原料。
 */
export function mergePortions(g: Game, aId: number, bId: number) {
  if (aId === bId) return;
  const a = g.portions.find((p) => p.id === aId);
  const b = g.portions.find((p) => p.id === bId);
  if (!a || !b) return;
  if (a.recipe !== b.recipe) {
    g.notice = "只有同配方净料才能合并";
    return;
  }
  a.weight += b.weight;
  a.trim += b.trim;
  a.preparedAt = Math.min(a.preparedAt, b.preparedAt);
  g.portions = g.portions.filter((p) => p.id !== bId);
  g.notice = `已合并为一份 ${formatGrams(a.weight)} 净料，仍为已切份`;
}

export function scrapPortion(g: Game, id: number, weight?: number) {
  const p = g.portions.find((p) => p.id === id);
  if (!p) return;
  const amount = Math.max(0, Math.min(p.weight, weight ?? p.weight));
  const i = recipes[p.recipe].ingredient;
  if (amount >= p.weight) {
    g.portions = g.portions.filter((x) => x.id !== id);
  } else {
    p.weight -= amount;
  }
  recordDisposal(g, {
    ingredient: i,
    recipe: p.recipe,
    weight: amount,
    reason: "scrap",
    source: "报废净料",
  });
  g.notice = `报废 ${formatGrams(amount)} 净料，已记入损耗`;
}
