import type {
  Game,
  Ingredient,
  IngredientStock,
  Order,
  PortionSize,
  RecipeId,
} from "./types";
import { ingredients, recipes } from "./catalog";

const INGREDIENT_KEYS: Ingredient[] = ["beef", "noodle", "greens"];

function emptyStock(): Record<Ingredient, IngredientStock> {
  return {
    beef: { sealed: 0, open: 0 },
    noodle: { sealed: 0, open: 0 },
    greens: { sealed: 0, open: 0 },
  };
}

function emptyWeights(): Record<Ingredient, number> {
  return { beef: 0, noodle: 0, greens: 0 };
}

/** 旧版初始库存 5 / 5 / 6 份，按每份标准净重换算成克。 */
const START_WEIGHT: Record<Ingredient, number> = {
  beef: 5 * recipes.steak.baseWeight,
  noodle: 5 * recipes.pasta.baseWeight,
  greens: 6 * recipes.salad.baseWeight,
};

function splitSealed(i: Ingredient, total: number): IngredientStock {
  const pack = ingredients[i].packWeight;
  return { sealed: Math.floor(total / pack) * pack, open: total % pack };
}

function order(
  id: number,
  recipe: RecipeId,
  size: PortionSize,
  guest: string,
  arrived: number,
  deadline: number,
): Order {
  return { id, recipe, size, guest, arrived, deadline, status: "waiting" };
}

export function createGame(best = 0): Game {
  const stock = emptyStock();
  for (const i of INGREDIENT_KEYS)
    stock[i] = splitSealed(i, START_WEIGHT[i]);

  const received = emptyWeights();
  for (const i of INGREDIENT_KEYS)
    received[i] = stock[i].sealed + stock[i].open;

  return {
    version: 2,
    time: 0,
    duration: 180,
    running: false,
    ended: false,
    nextId: 4,
    selectedOrder: null,
    selectedDish: null,
    orders: [
      order(1, "steak", "regular", "林小姐", 0, 65),
      order(2, "pasta", "regular", "周先生", 0, 75),
      order(3, "salad", "small", "小陈", 0, 55),
    ],
    stock,
    receivedWeight: received,
    portions: [],
    stoves: [
      { id: 1, kind: "pan", batch: null },
      { id: 2, kind: "pan", batch: null },
      { id: 3, kind: "pot", batch: null },
    ],
    dishes: [],
    disposals: [],
    servedWeight: emptyWeights(),
    entries: [],
    combo: 0,
    served: 0,
    missed: 0,
    notice: "准备好了吗？开门迎接第一位客人。",
    best,
  };
}

/**
 * 旧版存档只有 stock: { beef: 5 } 这样的份数，没有版本号。
 * 这里按每份标准净重换算成克，换算后的总重量必须与份数一致。
 */
export function migrateLegacy(raw: unknown): Game | null {
  if (!raw || typeof raw !== "object") return null;
  const legacy = raw as Record<string, any>;
  if (legacy.version === 2) return normalizeV2(legacy);
  if (!legacy.stock || typeof legacy.stock !== "object") return null;

  const game = createGame(Number(legacy.best) || 0);
  if (typeof legacy.time === "number") game.time = legacy.time;
  if (typeof legacy.duration === "number") game.duration = legacy.duration;
  if (typeof legacy.served === "number") game.served = legacy.served;
  if (typeof legacy.missed === "number") game.missed = legacy.missed;

  const stock = emptyStock();
  for (const i of INGREDIENT_KEYS) {
    const portionCount = Math.max(0, Number(legacy.stock[i] ?? 0));
    const per = recipes[recipeOf(i)].baseWeight;
    stock[i] = splitSealed(i, portionCount * per);
  }
  game.stock = stock;
  for (const i of INGREDIENT_KEYS)
    game.receivedWeight[i] = stock[i].sealed + stock[i].open;

  game.portions = [];
  game.dishes = [];
  game.disposals = [];
  game.servedWeight = emptyWeights();
  game.stoves = [
    { id: 1, kind: "pan", batch: null },
    { id: 2, kind: "pan", batch: null },
    { id: 3, kind: "pot", batch: null },
  ];
  game.orders = loadOrders(legacy);
  game.notice = "旧存档已按标准重量换算，库存与成品重量均已对齐。";
  return game;
}

function recipeOf(i: Ingredient): RecipeId {
  return i === "beef" ? "steak" : i === "noodle" ? "pasta" : "salad";
}

/**
 * 同一版本号的存档也可能来自旧结构（例如缺少 disposals）。
 * 这里补齐缺省字段，保证核对表不会读到 undefined。
 */
function normalizeV2(legacy: Record<string, any>): Game {
  const game = createGame(Number(legacy.best) || 0);
  game.time = Number(legacy.time) || 0;
  game.duration = Number(legacy.duration) || 180;
  game.running = !!legacy.running;
  game.ended = !!legacy.ended;
  game.nextId = Number(legacy.nextId) || 4;
  game.selectedOrder = legacy.selectedOrder ?? null;
  game.selectedDish = legacy.selectedDish ?? null;
  game.orders = loadOrders(legacy);
  game.portions = Array.isArray(legacy.portions) ? legacy.portions : [];
  game.stoves = Array.isArray(legacy.stoves)
    ? legacy.stoves
    : game.stoves;
  game.dishes = Array.isArray(legacy.dishes) ? legacy.dishes : [];
  game.disposals = Array.isArray(legacy.disposals) ? legacy.disposals : [];
  game.entries = Array.isArray(legacy.entries) ? legacy.entries : [];
  game.combo = Number(legacy.combo) || 0;
  game.served = Number(legacy.served) || 0;
  game.missed = Number(legacy.missed) || 0;
  game.notice = String(legacy.notice ?? game.notice);
  game.best = Number(legacy.best) || 0;

  const stock = emptyStock();
  for (const i of INGREDIENT_KEYS) {
    const s = legacy.stock?.[i] ?? {};
    stock[i] = {
      sealed: Number(s.sealed) || 0,
      open: Number(s.open) || 0,
    };
  }
  game.stock = stock;

  const received = emptyWeights();
  const src = legacy.receivedWeight ?? {};
  for (const i of INGREDIENT_KEYS) {
    received[i] = Number.isFinite(Number(src[i]))
      ? Number(src[i])
      : stock[i].sealed + stock[i].open;
  }
  game.receivedWeight = received;
  const served = emptyWeights();
  const sv = legacy.servedWeight ?? {};
  for (const i of INGREDIENT_KEYS) served[i] = Number(sv[i]) || 0;
  game.servedWeight = served;
  return game;
}

function loadOrders(legacy: Record<string, any>): Order[] {
  if (!Array.isArray(legacy.orders)) return createGame().orders;
  return legacy.orders
    .filter(
      (o: any) =>
        o && typeof o.id === "number" && Object.hasOwn(recipes, o.recipe),
    )
    .map((o: any) => ({
      id: o.id,
      recipe: o.recipe as RecipeId,
      size: (["small", "regular", "double"].includes(o.size)
        ? o.size
        : "regular") as PortionSize,
      guest: String(o.guest ?? "客人"),
      arrived: Number(o.arrived ?? 0),
      deadline: Number(o.deadline ?? 60),
      status: (["waiting", "accepted", "served", "left"].includes(o.status)
        ? o.status
        : "waiting") as Order["status"],
    }));
}
