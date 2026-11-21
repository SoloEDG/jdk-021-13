<script setup lang="ts">
import type { Game } from "../../../shared/types";
import { ingredients } from "../../../shared/catalog";
import { formatGrams } from "../../../shared/weights";
import { totals } from "../lib/totals";
import { balanceRows, balanceOk } from "../lib/balance";
defineProps<{ game: Game }>();
</script>
<template>
  <section class="ledger">
    <div>
      <span class="eyebrow">05 / TODAY'S TAKINGS</span>
      <h2>营业手账</h2>
    </div>
    <div class="ledger-stat">
      <small>营业收入</small><b>¥{{ totals(game).sales }}</b>
    </div>
    <div class="ledger-stat">
      <small>采购 / 损失</small><b class="red">−¥{{ totals(game).cost }}</b>
    </div>
    <div class="ledger-stat">
      <small>成功 / 离店</small
      ><b
        >{{ game.served }} <span class="muted">/ {{ game.missed }}</span></b
      >
    </div>
    <div class="ledger-stat">
      <small>历史最佳</small><b>¥{{ game.best }}</b>
    </div>
    <div class="receipt">
      <div v-for="e in game.entries.slice(-3).reverse()" :key="e.id">
        <span>{{ e.label }}</span
        ><b>{{ e.amount >= 0 ? "+" : "" }}{{ e.amount }}</b>
      </div>
      <span v-if="!game.entries.length" class="muted"
        >第一笔收入，马上就来。</span
      >
    </div>
  </section>
  <section class="balance">
    <div class="balance-head">
      <h2>物料核对 <span class="small">WEIGHT LEDGER</span></h2>
      <span class="pill" :class="{ red: !balanceOk(game) }">{{
        balanceOk(game) ? "入库 = 去向 ✓" : "存在未对上的重量"
      }}</span>
    </div>
    <div class="balance-table">
      <div class="balance-row balance-labels">
        <span>原料</span><span>入库</span><span>库存</span><span>备料</span
        ><span>在锅</span><span>出餐台</span><span>已上菜</span><span>损耗</span
        ><span>差额</span>
      </div>
      <div v-for="r in balanceRows(game)" :key="r.ingredient" class="balance-row">
        <span>{{ ingredients[r.ingredient].icon }} {{ ingredients[r.ingredient].name }}</span>
        <span>{{ formatGrams(r.received) }}</span>
        <span>{{ formatGrams(r.sealed + r.open) }}</span>
        <span>{{ formatGrams(r.prep) }}</span>
        <span>{{ formatGrams(r.cooking) }}</span>
        <span>{{ formatGrams(r.counter) }}</span>
        <span>{{ formatGrams(r.served) }}</span>
        <span class="red">{{ formatGrams(r.loss) }}</span>
        <span :class="{ red: Math.abs(r.diff) >= 0.5 }">{{ r.diff }}g</span>
      </div>
    </div>
    <div v-if="game.disposals.length" class="disposal-list">
      <span class="muted">最近损耗去向</span>
      <div v-for="d in game.disposals.slice(-4).reverse()" :key="d.id">
        <span>{{ d.source }}</span>
        <b>{{ formatGrams(d.weight) }}</b>
      </div>
    </div>
  </section>
</template>
