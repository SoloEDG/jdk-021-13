import type { Game } from "../../../shared/types";
import { recipes } from "../../../shared/catalog";
import { totals } from "../lib/totals";
import { recordDisposal } from "../lib/balance";

/**
 * 打烊时把还留在厨房里的物料全部落账：
 * 备料、在锅、出餐台各记一条损耗并写清去向，库存保留但可追踪。
 */
export function closeShift(g: Game) {
  for (const p of g.portions) {
    recordDisposal(g, {
      ingredient: recipes[p.recipe].ingredient,
      recipe: p.recipe,
      weight: p.weight,
      reason: "closing",
      source: `打烊备料 #${p.id}`,
    });
  }
  for (const s of g.stoves) {
    if (!s.batch) continue;
    recordDisposal(g, {
      ingredient: recipes[s.batch.recipe].ingredient,
      recipe: s.batch.recipe,
      weight: s.batch.weight,
      reason: "closing",
      source: `打烊在锅 ${s.kind === "pan" ? "煎锅" : "汤锅"}0${s.id}`,
    });
    s.batch = null;
  }
  for (const d of g.dishes) {
    recordDisposal(g, {
      ingredient: recipes[d.recipe].ingredient,
      recipe: d.recipe,
      weight: d.weight,
      reason: "closing",
      source: "打烊出餐台余量",
    });
  }
  g.portions = [];
  g.dishes = [];
  g.stoves.forEach((s) => (s.batch = null));
  g.selectedDish = null;
  g.selectedOrder = null;
  g.running = false;
  g.ended = true;
  g.best = Math.max(g.best, totals(g).net);
  const lost = g.disposals.reduce((s, d) => s + d.weight, 0);
  g.notice = `午市结束，辛苦了，主厨！本次共 ${lost > 0 ? `记录 ${Math.round(lost)}g 损耗` : "没有额外损耗"}`;
}

export function saveBest(g: Game) {
  try {
    localStorage.setItem("lunch-rush-best", String(g.best));
  } catch {
    g.notice = "浏览器存储不可用，本局结算仍然有效";
  }
}

export function readBest() {
  try {
    const v = Number(localStorage.getItem("lunch-rush-best"));
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  } catch {
    return 0;
  }
}
