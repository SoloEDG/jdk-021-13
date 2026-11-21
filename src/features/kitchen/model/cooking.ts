import type { Game } from "../../../shared/types";
import { recipes, stationName } from "../../../shared/catalog";
import { quality } from "../lib/heat";
import {
  formatGrams,
  requiredWeight,
  batchTarget,
} from "../../../shared/weights";

export const COUNTER_CAPACITY = 10;

/** 把同一配方、来自不同订单的若干净料合进一锅。 */
export function startBatch(
  g: Game,
  stoveId: number,
  portionIds: number[],
) {
  const s = g.stoves.find((s) => s.id === stoveId);
  if (!s) return;
  const picks = portionIds
    .map((id) => g.portions.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  if (!picks.length) {
    g.notice = "请先选择要下锅的净料";
    return;
  }
  const recipe = picks[0].recipe;
  if (picks.some((p) => p.recipe !== recipe)) {
    g.notice = "同一锅只能合做同配方的净料";
    return;
  }
  if (recipes[recipe].station !== s.kind) {
    g.notice = `设备不匹配：${recipes[recipe].name}要用${stationName[recipes[recipe].station]}`;
    return;
  }
  if (s.batch) {
    g.notice = "这口锅还在烹饪";
    return;
  }
  const weight = picks.reduce((sum, p) => sum + p.weight, 0);
  const batch = {
    id: g.nextId++,
    recipe,
    portions: picks,
    weight,
    target: batchTarget(recipe, weight),
    started: g.time,
  };
  s.batch = batch;
  const ids = new Set(picks.map((p) => p.id));
  g.portions = g.portions.filter((p) => !ids.has(p.id));
  g.notice = `已下锅 ${formatGrams(weight)}，预计最适合在 ${batch.target} 秒起锅`;
}

/**
 * 起锅时把一锅按重量拆成可追踪的成品。
 * 若指定了目标订单，优先按该订单所需重量切出一份给这张单；
 * 其余重量仍可被其他订单的份额消耗，不会被记成一份完整收入。
 */
export function lift(g: Game, stoveId: number, orderId?: number | null) {
  const s = g.stoves.find((s) => s.id === stoveId);
  if (!s?.batch) return;
  if (g.dishes.length >= COUNTER_CAPACITY) {
    g.notice = "出餐台已满，请先上菜或丢弃";
    return;
  }
  const b = s.batch;
  const q = quality(b.recipe, g.time - b.started, b.target);

  let dishWeight = b.weight;
  if (orderId != null) {
    const o = g.orders.find((o) => o.id === orderId);
    if (!o || o.status !== "accepted" || o.recipe !== b.recipe) {
      g.notice = "目标订单与锅里的配方不匹配";
      return;
    }
    dishWeight = Math.min(b.weight, requiredWeight(o.recipe, o.size));
  }

  g.dishes.push({
    id: g.nextId++,
    recipe: b.recipe,
    quality: q,
    cookedAt: g.time,
    stage: "counter",
    weight: dishWeight,
    sourceBatch: b.id,
    leftover: false,
  });

  if (dishWeight < b.weight) {
    g.dishes.push({
      id: g.nextId++,
      recipe: b.recipe,
      quality: q,
      cookedAt: g.time,
      stage: "counter",
      weight: b.weight - dishWeight,
      sourceBatch: b.id,
      leftover: true,
    });
  }

  s.batch = null;
  const rest = b.weight - dishWeight;
  g.notice =
    rest > 0
      ? `起锅 ${formatGrams(b.weight)}，品质 ${q}；${formatGrams(dishWeight)} 给目标订单，余下 ${formatGrams(rest)} 留在出餐台待分派`
      : `起锅完成 ${formatGrams(b.weight)}，品质 ${q}，前往装盘`;
}
