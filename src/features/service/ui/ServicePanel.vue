<script setup lang="ts">
import { computed } from "vue";
import type { Game, Command } from "../../../shared/types";
import { recipes } from "../../../shared/catalog";
import { requiredWeight, formatGrams } from "../../../shared/weights";
import { servingQuality, servicePair } from "../lib/freshness";
const props = defineProps<{ game: Game }>();
defineEmits<{ command: [cmd: Command] }>();

const pair = computed(() => servicePair(props.game));
const need = computed(() =>
  pair.value.order
    ? requiredWeight(pair.value.order.recipe, pair.value.order.size)
    : 0,
);
const enough = computed(
  () =>
    !!pair.value.dish &&
    !!pair.value.order &&
    pair.value.dish.weight + 0.5 >= need.value,
);
</script>
<template>
  <section class="panel service-panel">
    <span class="eyebrow">04 / PASS & SERVE</span>
    <h2>装盘与上菜 <span class="small">SERVE</span></h2>
    <div class="dish-list">
      <article
        v-for="d in game.dishes"
        :key="d.id"
        class="dish-row"
        :class="{ selected: game.selectedDish === d.id }"
      >
        <span class="dish-icon">{{ recipes[d.recipe].icon }}</span>
        <div>
          <b>{{ recipes[d.recipe].name }} · {{ formatGrams(d.weight) }}</b
          ><small
            >品质 {{ servingQuality(game, d) }} ·
            {{ d.stage === "plated" ? "已装盘" : "待装盘"
            }}{{ d.leftover ? " · 余量" : "" }}</small
          >
        </div>
        <button
          class="tiny soft"
          @click="
            $emit('command', {
              type: d.stage === 'counter' ? 'plate' : 'select-dish',
              id: d.id,
            })
          "
        >
          {{ d.stage === "counter" ? "装盘" : "选择" }}</button
        ><button
          class="trash"
          aria-label="丢弃菜品"
          @click="$emit('command', { type: 'discard', id: d.id })"
        >
          ×
        </button>
      </article>
      <div v-if="!game.dishes.length" class="empty plate-empty">
        <div>◌</div>
        这里等待你的第一道美味<small>起锅 → 装盘 → 选择订单 → 上菜</small>
      </div>
    </div>
    <div class="delivery-target">
      上菜目标：<b
        >{{ pair.order?.guest || "尚未选择订单"
        }}{{ pair.order ? ` · 需 ${formatGrams(need)}` : "" }}</b
      >
      <div v-if="pair.dish && pair.order" class="muted">
        这份 {{ formatGrams(pair.dish.weight) }} ·
        {{ enough ? "份量足够" : "份量不足" }}
      </div>
    </div>
    <button
      class="serve-button"
      :disabled="!!pair.dish && !!pair.order && !enough"
      @click="$emit('command', { type: 'serve' })"
    >
      上菜 <span>↗</span>
    </button>
    <p class="muted">
      上菜只扣订单所需重量，余量留在出餐台继续分派；错配扣10秒耐心。
    </p>
  </section>
</template>
