export type RecipeId = "steak" | "pasta" | "salad";
export type Ingredient = "beef" | "noodle" | "greens";
export type PortionSize = "small" | "regular" | "double";
export type StationKind = "pan" | "pot";

export interface Recipe {
  id: RecipeId;
  name: string;
  icon: string;
  ingredient: Ingredient;
  station: StationKind;
  target: number;
  price: number;
  /** 标准份的净重（克），也是旧版 1 份食材换算的标准重量。 */
  baseWeight: number;
}

export interface Order {
  id: number;
  recipe: RecipeId;
  /** 客人点的是小份、标准份还是双份。 */
  size: PortionSize;
  guest: string;
  arrived: number;
  deadline: number;
  status: "waiting" | "accepted" | "served" | "left";
}

/** 已经切配好的净料，重量单位为克。 */
export interface Portion {
  id: number;
  recipe: RecipeId;
  weight: number;
  preparedAt: number;
  /** 切出这份净料时产生的修整边角（克）。 */
  trim: number;
}

/** 同一口锅里的一批净料，必须同配方，但可以来自不同订单。 */
export interface CookBatch {
  id: number;
  recipe: RecipeId;
  portions: Portion[];
  weight: number;
  /** 按整批重量计算出的最佳起锅时间。 */
  target: number;
  started: number;
}

export interface Stove {
  id: number;
  kind: StationKind;
  batch: CookBatch | null;
}

export interface Dish {
  id: number;
  recipe: RecipeId;
  quality: number;
  cookedAt: number;
  stage: "counter" | "plated";
  /** 成品的实际重量；上菜时按订单所需重量扣减。 */
  weight: number;
  sourceBatch: number | null;
  /** 是否为上菜后留在出餐台的余量。 */
  leftover: boolean;
}

export type DisposalReason = "trim" | "scrap" | "leftover" | "closing" | "stock";

/** 每一份离开可售流程的物料都要留下去向。 */
export interface Disposal {
  id: number;
  time: number;
  ingredient: Ingredient;
  recipe: RecipeId | null;
  weight: number;
  reason: DisposalReason;
  source: string;
}

export interface Entry {
  id: number;
  time: number;
  label: string;
  amount: number;
  kind: "sale" | "waste" | "miss" | "supply";
  /** 这笔流水涉及的物料重量（克），用于核对。 */
  weight?: number;
}

export interface IngredientStock {
  /** 未开封库存，单位克。只能通过采购增加。 */
  sealed: number;
  /** 已开封散料，单位克。切配只会从这里或新开封的包里取料。 */
  open: number;
}

export interface Game {
  version: 2;
  time: number;
  duration: number;
  running: boolean;
  ended: boolean;
  nextId: number;
  selectedOrder: number | null;
  selectedDish: number | null;
  orders: Order[];
  stock: Record<Ingredient, IngredientStock>;
  /** 本局累计入库重量（含初始库存与采购），是物料核对的起点。 */
  receivedWeight: Record<Ingredient, number>;
  portions: Portion[];
  stoves: Stove[];
  dishes: Dish[];
  disposals: Disposal[];
  /** 已经交付给客人的重量，离开厨房但仍需参与核对。 */
  servedWeight: Record<Ingredient, number>;
  entries: Entry[];
  combo: number;
  served: number;
  missed: number;
  notice: string;
  best: number;
}

export type Command =
  | { type: "accept"; id: number }
  | { type: "select-order"; id: number }
  | { type: "prepare"; recipe: RecipeId; weight: number }
  | { type: "merge-portions"; a: number; b: number }
  | { type: "cook"; portions: number[]; stove: number }
  | { type: "lift"; id: number; order?: number | null }
  | { type: "plate"; id: number }
  | { type: "select-dish"; id: number }
  | { type: "serve" }
  | { type: "discard"; id: number; weight?: number }
  | { type: "scrap-portion"; id: number; weight?: number }
  | { type: "restock"; ingredient: Ingredient };
