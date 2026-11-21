<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { Game, Command, RecipeId } from "../../../shared/types";
import { recipeList, recipes, ingredients } from "../../../shared/catalog";
import IngredientShelf from "./IngredientShelf.vue";
import { preparationIssue, maxPortionFor } from "../lib/availability";
import {
  requiredWeight,
  trimFor,
  grossFor,
  sizeSpecs,
  formatGrams,
} from "../../../shared/weights";
const props = defineProps<{ game: Game }>();
const emits = defineEmits<{ command: [cmd: Command] }>();

const weights = reactive<Record<RecipeId, number>>({
  steak: recipes.steak.baseWeight,
  pasta: recipes.pasta.baseWeight,
  salad: recipes.salad.baseWeight,
});
const selected = ref<number[]>([]);

function maxFor(r: RecipeId) {
  return maxPortionFor(props.game, r);
}
function clampWeight(r: RecipeId) {
  const max = maxFor(r);
  weights[r] = Math.max(0, Math.min(max, Math.round(weights[r] || 0)));
}
function prep(r: RecipeId) {
  emits("command", { type: "prepare", recipe: r, weight: weights[r] });
}
function pickSize(r: RecipeId, size: "small" | "regular" | "double") {
  weights[r] = Math.min(maxFor(r), requiredWeight(r, size));
}
// 库存变化后自动把重量收进可用范围，避免显示一个切不出来的份量。
watch(
  () => props.game.stock,
  () => {
    for (const r of recipeList) {
      const max = maxFor(r.id);
      if (weights[r.id] > max) weights[r.id] = max;
    }
  },
  { deep: true },
);
function toggleSelect(id: number) {
  const at = selected.value.indexOf(id);
  if (at >= 0) selected.value.splice(at, 1);
  else {
    selected.value.push(id);
    if (selected.value.length > 2) selected.value.shift();
  }
}
function merge() {
  if (selected.value.length !== 2) return;
  emits("command", {
    type: "merge-portions",
    a: selected.value[0],
    b: selected.value[1],
  });
  selected.value = [];
}
function scrap(id: number) {
  emits("command", { type: "scrap-portion", id });
  selected.value = selected.value.filter((x) => x !== id);
}
</script>
<template>
  <section class="panel pantry-panel">
    <span class="eyebrow">02 / PREP STATION</span>
    <h2>食材准备 <span class="small">PREP</span></h2>
    <IngredientShelf
      :game="game"
      @restock="
        (ingredient) => $emit('command', { type: 'restock', ingredient })
      "
    />
    <div class="prep-recipes">
      <div v-for="r in recipeList" :key="r.id" class="prep-recipe">
        <div class="prep-recipe-head">
          <span>{{ r.icon }} <b>{{ r.name }}</b></span>
          <small class="muted"
            >可用 {{ formatGrams(maxFor(r.id)) }} /
            {{ ingredients[r.ingredient].name }}</small
          >
        </div>
        <div class="size-chips">
          <button
            v-for="(spec, key) in sizeSpecs"
            :key="key"
            class="chip"
            :class="{ active: weights[r.id] === requiredWeight(r.id, key) }"
            @click="pickSize(r.id, key)"
          >
            {{ spec.label }} {{ requiredWeight(r.id, key) }}g
          </button>
        </div>
        <div class="weight-row">
          <input
            v-model.number="weights[r.id]"
            type="number"
            min="0"
            :max="maxFor(r.id)"
            step="10"
            :aria-label="r.name + ' 净料重量'"
            @blur="clampWeight(r.id)"
          />
          <small class="muted">g 净料</small>
          <button
            class="tiny soft prep-go"
            :disabled="!!preparationIssue(game, r.id, weights[r.id])"
            @click="prep(r.id)"
          >
            切配
          </button>
        </div>
        <p class="prep-meta muted">
          取毛料 {{ grossFor(r.id, weights[r.id] || 0) }}g · 边角
          {{ trimFor(r.id, weights[r.id] || 0) }}g 计损耗
          <span v-if="preparationIssue(game, r.id, weights[r.id])" class="red">
            · {{ preparationIssue(game, r.id, weights[r.id]) }}</span
          >
        </p>
      </div>
    </div>
    <div class="portion-list">
      <div class="portion-list-head">
        <b>备料台 {{ game.portions.length }} / 6</b>
        <button
          class="tiny soft"
          :disabled="selected.length !== 2"
          @click="merge"
        >
          合并所选
        </button>
      </div>
      <article
        v-for="p in game.portions"
        :key="p.id"
        class="portion-item"
        :class="{ selected: selected.includes(p.id) }"
        @click="toggleSelect(p.id)"
      >
        <span>{{ recipes[p.recipe].icon }}</span>
        <div>
          <b>{{ recipes[p.recipe].name }} · {{ formatGrams(p.weight) }}</b>
          <small class="muted">#{{ p.id }} · 边角 {{ formatGrams(p.trim) }}</small>
        </div>
        <button
          class="trash"
          aria-label="报废这份净料"
          @click.stop="scrap(p.id)"
        >
          ×
        </button>
      </article>
      <p v-if="!game.portions.length" class="muted prep-empty">
        还没有切好的净料。选好重量后点「切配」。
      </p>
    </div>
    <p class="muted">
      合并只会把同配方净料并成更大的一份，仍是已切份，不能退回未开封原料。
    </p>
  </section>
</template>
