import type { Game } from "../../../shared/types";
import { recipes } from "../../../shared/catalog";
import { formatGrams } from "../../../shared/weights";
import { recordDisposal } from "../../ledger/lib/balance";

export function plate(g: Game, id: number) {
  const d = g.dishes.find((d) => d.id === id);
  if (!d || d.stage !== "counter") return;
  d.stage = "plated";
  d.leftover = false;
  g.selectedDish = id;
  g.notice = "装盘完成，请选中订单后上菜";
}

/**
 * 部分报废：只丢掉指定重量，剩下的仍留在出餐台。
 * 不传重量则整份报废。
 */
export function discard(g: Game, id: number, weight?: number) {
  const d = g.dishes.find((d) => d.id === id);
  if (!d) return;
  const amount = Math.max(0, Math.min(d.weight, weight ?? d.weight));
  d.weight -= amount;
  recordDisposal(g, {
    ingredient: recipes[d.recipe].ingredient,
    recipe: d.recipe,
    weight: amount,
    reason: "scrap",
    source: "报废菜品",
  });
  if (d.weight <= 0) {
    g.dishes = g.dishes.filter((x) => x.id !== id);
    if (g.selectedDish === id) g.selectedDish = null;
  } else if (d.stage === "plated") {
    d.stage = "counter";
    if (g.selectedDish === id) g.selectedDish = null;
  }
  g.notice = `报废 ${formatGrams(amount)}，${d.weight > 0 ? `余下 ${formatGrams(d.weight)} 仍在出餐台` : "已清空"}`;
}
