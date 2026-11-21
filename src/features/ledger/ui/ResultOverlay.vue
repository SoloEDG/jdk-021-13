<script setup lang="ts">
import type { Game } from "../../../shared/types";
import { totals, grade } from "../lib/totals";
import { balanceOk } from "../lib/balance";
defineProps<{ game: Game }>();
defineEmits<{ restart: [] }>();
const lost = (g: Game) =>
  Math.round(
    g.disposals.filter((d) => d.reason !== "leftover").reduce((s, d) => s + d.weight, 0),
  );
</script>
<template>
  <div v-if="game.ended" class="overlay">
    <section class="result">
      <span class="eyebrow">SHIFT COMPLETE</span>
      <div class="grade">{{ grade(game) }}</div>
      <h2>午市打烊，主厨辛苦了</h2>
      <p>
        本场净收益 <b>¥{{ totals(game).net }}</b>
      </p>
      <p>完成 {{ game.served }} 单 · 离店 {{ game.missed }} 位</p>
      <p class="muted">
        损耗 {{ lost(game) }}g · 物料核对
        {{ balanceOk(game) ? "已对上" : "未对上" }}
      </p>
      <button @click="$emit('restart')">再开一家好餐厅 ↗</button>
    </section>
  </div>
</template>
