<script setup lang="ts">
import type { Game, Ingredient } from "../../../shared/types";
import { ingredients } from "../../../shared/catalog";
import { stockTotal, formatGrams } from "../../../shared/weights";
defineProps<{ game: Game }>();
defineEmits<{ restock: [i: Ingredient] }>();
const ids: Ingredient[] = ["beef", "noodle", "greens"];
</script>
<template>
  <div class="shelf">
    <div v-for="i in ids" :key="i" class="stock-row">
      <span class="stock-name"
        >{{ ingredients[i].icon }} {{ ingredients[i].name }}</span
      >
      <div class="stock-weights">
        <b :class="{ red: stockTotal(game, i) === 0 }"
          >{{ formatGrams(stockTotal(game, i)) }}</b
        >
        <small class="muted"
          >未开封 {{ formatGrams(game.stock[i].sealed) }} · 散料
          {{ formatGrams(game.stock[i].open) }}</small
        >
      </div>
      <button
        class="tiny soft"
        @click="$emit('restock', i)"
        :aria-label="'采购一包' + ingredients[i].name"
      >
        +1包 / ¥{{ ingredients[i].packCost }}
      </button>
    </div>
  </div>
</template>
