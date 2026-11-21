import { reactive, onUnmounted } from "vue";
import { createGame, migrateLegacy } from "../shared/initial";
import { expire, arrive } from "../features/orders";
import { closeShift, saveBest, readBest } from "../features/ledger";
import type { Game } from "../shared/types";

const SAVE_KEY = "lunch-rush-save";
const SAVE_VERSION = 2;

function loadGame(fallbackBest: number): Game {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createGame(fallbackBest);
    const parsed = JSON.parse(raw);
    const migrated = migrateLegacy(parsed);
    if (migrated) {
      // 重新打开页面时先暂停，避免计时和顾客耐心在后台空转。
      migrated.running = false;
      if (!migrated.ended)
        migrated.notice = "已恢复上次进度，点击继续营业。";
      return migrated;
    }
  } catch {
    /* 存档损坏时回到新局 */
  }
  return createGame(fallbackBest);
}

function persist(g: Game) {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ ...g, version: SAVE_VERSION }),
    );
  } catch {
    /* 存储不可用时忽略，游戏仍可继续 */
  }
}

export function useSession() {
  const game = reactive<Game>(loadGame(readBest()));
  let last = performance.now(),
    carry = 0,
    saveClock = 0;
  const timer = setInterval(() => {
    const now = performance.now(),
      dt = Math.min(0.5, (now - last) / 1000);
    last = now;
    if (!game.running) return;
    carry += dt;
    while (carry >= 0.1 && game.running) {
      carry -= 0.1;
      game.time = Math.min(
        game.duration,
        Math.round((game.time + 0.1) * 10) / 10,
      );
      expire(game);
      if (Math.round(game.time * 10) % 180 === 0) arrive(game);
      if (game.time >= game.duration) {
        closeShift(game);
        saveBest(game);
      }
    }
    saveClock += dt;
    if (saveClock >= 2) {
      saveClock = 0;
      persist(game);
    }
  }, 50);
  onUnmounted(() => clearInterval(timer));
  function toggle() {
    if (game.ended) return;
    carry = 0;
    last = performance.now();
    game.running = !game.running;
    game.notice = game.running
      ? "营业中，客人已经入座。"
      : "已暂停，所有厨房计时冻结。";
    persist(game);
  }
  function restart() {
    Object.assign(game, createGame(game.best));
    carry = 0;
    last = performance.now();
    persist(game);
  }
  return { game, toggle, restart };
}
