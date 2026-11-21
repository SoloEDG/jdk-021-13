import type { Recipe, RecipeId, Ingredient, StationKind } from "./types";
export const recipes: Record<RecipeId, Recipe> = {
  steak: {
    id: "steak",
    name: "香煎牛排",
    icon: "🥩",
    ingredient: "beef",
    station: "pan",
    target: 12,
    price: 48,
    baseWeight: 180,
  },
  pasta: {
    id: "pasta",
    name: "奶油意面",
    icon: "🍝",
    ingredient: "noodle",
    station: "pot",
    target: 10,
    price: 36,
    baseWeight: 150,
  },
  salad: {
    id: "salad",
    name: "温蔬沙拉",
    icon: "🥗",
    ingredient: "greens",
    station: "pan",
    target: 6,
    price: 28,
    baseWeight: 120,
  },
};
export const ingredients: Record<
  Ingredient,
  {
    name: string;
    icon: string;
    /** 旧版一份的价格，用于换算每克成本。 */
    cost: number;
    /** 修整时按净重产生的边角比例。 */
    trimRate: number;
    /** 一个未开封原料包的重量，等于三个标准份。 */
    packWeight: number;
    packCost: number;
  }
> = {
  beef: {
    name: "牛肉",
    icon: "🥩",
    cost: 12,
    trimRate: 0.12,
    packWeight: 540,
    packCost: 36,
  },
  noodle: {
    name: "面条",
    icon: "🍜",
    cost: 7,
    trimRate: 0.04,
    packWeight: 450,
    packCost: 21,
  },
  greens: {
    name: "时蔬",
    icon: "🥬",
    cost: 5,
    trimRate: 0.18,
    packWeight: 360,
    packCost: 15,
  },
};
export const recipeList = Object.values(recipes);
export const stationName: Record<StationKind, string> = {
  pan: "煎锅",
  pot: "汤锅",
};
/** 每克原料的成本，用于把损耗换算成金额。 */
export function costPerGram(i: Ingredient) {
  return ingredients[i].packCost / ingredients[i].packWeight;
}
