import type { Game } from "../../../shared/types";
import { recipes } from "../../../shared/catalog";
import { requiredWeight, orderQuote, formatGrams } from "../../../shared/weights";
import { servingQuality, servicePair } from "../lib/freshness";
import { recordDisposal } from "../../ledger/lib/balance";

const MIN_LEFTOVER = 5;

function removeDish(g: Game, id: number) {
  g.dishes = g.dishes.filter((d) => d.id !== id);
  if (g.selectedDish === id) g.selectedDish = null;
}

export function deliver(g: Game) {
  const { dish, order } = servicePair(g);
  if (!dish || dish.stage !== "plated" || !order) {
    g.notice = "请选择已装盘菜品和已接订单";
    return;
  }
  if (dish.recipe !== order.recipe) {
    order.deadline = Math.max(g.time, order.deadline - 10);
    g.combo = 0;
    g.notice = "上错菜！客人耐心减少10秒，菜品仍留在出餐台";
    return;
  }
  const need = requiredWeight(order.recipe, order.size);
  if (dish.weight + 0.5 < need) {
    g.notice = `份量不足：这份只有 ${formatGrams(dish.weight)}，订单需要 ${formatGrams(need)}`;
    return;
  }
  const q = servingQuality(g, dish);
  if (q < 30) {
    order.deadline = Math.max(g.time, order.deadline - 8);
    g.notice = "品质低于30，客人拒收，耐心减少8秒";
    return;
  }

  const served = Math.min(dish.weight, need);
  g.servedWeight[recipes[dish.recipe].ingredient] += served;
  dish.weight -= served;
  const remainder = dish.weight;

  if (remainder < MIN_LEFTOVER) {
    if (remainder > 0)
      recordDisposal(g, {
        ingredient: recipes[dish.recipe].ingredient,
        recipe: dish.recipe,
        weight: remainder,
        reason: "leftover",
        source: "上菜余量",
      });
    removeDish(g, dish.id);
  } else {
    // 同一份物料的一部分已经交付，剩下的仍留在出餐台等待分派，
    // 不会被记成第二份完整收入。保温会继续按起锅时间失温。
    dish.stage = "counter";
    dish.leftover = true;
  }

  g.combo++;
  g.served++;
  order.status = "served";
  const amount =
    Math.round((orderQuote(order.recipe, order.size) * q) / 100) +
    Math.min(10, (g.combo - 1) * 2);
  g.entries.push({
    id: g.nextId++,
    time: g.time,
    label: `${order.guest} · ${recipes[dish.recipe].name}`,
    amount,
    kind: "sale",
    weight: served,
  });
  g.selectedDish = null;
  g.selectedOrder = null;
  g.notice =
    remainder >= MIN_LEFTOVER
      ? `交付 ${formatGrams(served)} +¥${amount} · 余量 ${formatGrams(remainder)} 留在出餐台 · 连续 ${g.combo} 单`
      : `交付成功 +¥${amount} · 连续交付 ${g.combo} 单`;
}
