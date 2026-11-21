import type { Game } from "../../../shared/types";
export function totals(g: Game) {
  return {
    net: Math.round(g.entries.reduce((s, e) => s + e.amount, 0) * 100) / 100,
    sales: g.entries
      .filter((e) => e.kind === "sale")
      .reduce((s, e) => s + e.amount, 0),
    cost:
      Math.round(
        -g.entries
          .filter((e) => e.amount < 0)
          .reduce((s, e) => s + e.amount, 0) * 100,
      ) / 100,
  };
}
export function grade(g: Game) {
  const n = totals(g).net;
  return n >= 400 ? "S" : n >= 250 ? "A" : n >= 120 ? "B" : "C";
}
