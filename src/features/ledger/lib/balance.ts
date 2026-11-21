import type {
  Disposal,
  DisposalReason,
  Game,
  Ingredient,
  RecipeId,
} from "../../../shared/types";
import { ingredients, costPerGram, recipes } from "../../../shared/catalog";
import { formatGrams } from "../../../shared/weights";

const reasonLabel: Record<DisposalReason, string> = {
  trim: "修整边角",
  scrap: "报废",
  leftover: "余量",
  closing: "打烊清台",
  stock: "库存清理",
};

/** 把一份物料送进损耗台账，同时生成一条账本流水。 */
export function recordDisposal(
  g: Game,
  d: {
    ingredient: Ingredient;
    recipe: RecipeId | null;
    weight: number;
    reason: DisposalReason;
    source: string;
  },
): Disposal {
  const amount = -Math.round(d.weight * costPerGram(d.ingredient) * 100) / 100;
  const disposal: Disposal = {
    id: g.nextId++,
    time: g.time,
    ingredient: d.ingredient,
    recipe: d.recipe,
    weight: d.weight,
    reason: d.reason,
    source: d.source,
  };
  g.disposals.push(disposal);
  if (d.weight > 0) {
    g.entries.push({
      id: g.nextId++,
      time: g.time,
      label: `${d.source} ${reasonLabel[d.reason]} ${formatGrams(d.weight)}`,
      amount,
      kind: "waste",
      weight: d.weight,
    });
  }
  return disposal;
}

export interface IngredientRow {
  ingredient: Ingredient;
  received: number;
  sealed: number;
  open: number;
  prep: number;
  cooking: number;
  counter: number;
  served: number;
  loss: number;
  /** 所有去向之和，必须与 received 相等。 */
  accounted: number;
  diff: number;
}

/** 逐原料核对：入库 = 库存 + 备料 + 在锅 + 出餐台 + 已上菜 + 损耗。 */
export function balanceRows(g: Game): IngredientRow[] {
  return (Object.keys(ingredients) as Ingredient[]).map((i) => {
    let prep = 0;
    for (const p of g.portions)
      if (recipes[p.recipe].ingredient === i) prep += p.weight;
    let cooking = 0;
    for (const s of g.stoves)
      if (s.batch && recipes[s.batch.recipe].ingredient === i)
        cooking += s.batch.weight;
    let counter = 0;
    for (const d of g.dishes)
      if (recipes[d.recipe].ingredient === i) counter += d.weight;
    let loss = 0;
    for (const d of g.disposals) if (d.ingredient === i) loss += d.weight;
    const sealed = g.stock[i].sealed,
      open = g.stock[i].open;
    const served = g.servedWeight[i];
    const accounted =
      sealed + open + prep + cooking + counter + served + loss;
    return {
      ingredient: i,
      received: g.receivedWeight[i],
      sealed,
      open,
      prep,
      cooking,
      counter,
      served,
      loss,
      accounted,
      diff: Math.round((g.receivedWeight[i] - accounted) * 100) / 100,
    };
  });
}

export function balanceOk(g: Game) {
  return balanceRows(g).every((r) => Math.abs(r.diff) < 0.5);
}

