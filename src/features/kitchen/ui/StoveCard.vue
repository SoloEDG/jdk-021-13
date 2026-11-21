<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Game, Stove, Command } from "../../../shared/types";
import { recipes, stationName } from "../../../shared/catalog";
import {
  formatGrams,
  batchTarget,
  requiredWeight,
  formatTime,
} from "../../../shared/weights";
import { heatLabel } from "../lib/heat";
const props = defineProps<{ game: Game; stove: Stove }>();
const emits = defineEmits<{ command: [cmd: Command] }>();

const picked = ref<number[]>([]);

const candidates = computed(() =>
  props.game.portions.filter(
    (p) => recipes[p.recipe].station === props.stove.kind,
  ),
);
const pickedPortions = computed(() =>
  candidates.value.filter((p) => picked.value.includes(p.id)),
);
const pickedRecipe = computed(() => pickedPortions.value[0]?.recipe ?? null);
const pickedWeight = computed(() =>
  pickedPortions.value.reduce((s, p) => s + p.weight, 0),
);
const mixIssue = computed(() =>
  pickedPortions.value.some((p) => p.recipe !== pickedRecipe.value)
    ? "只能合做同配方净料"
    : "",
);
const expectedTarget = computed(() =>
  pickedRecipe.value ? batchTarget(pickedRecipe.value, pickedWeight.value) : 0,
);

watch(
  () => props.game.portions,
  (list) => {
    picked.value = picked.value.filter((id) => list.some((p) => p.id === id));
  },
);

function toggle(id: number) {
  const at = picked.value.indexOf(id);
  if (at >= 0) picked.value.splice(at, 1);
  else picked.value.push(id);
}
function cook() {
  if (!picked.value.length || mixIssue.value) return;
  emits("command", {
    type: "cook",
    portions: [...picked.value],
    stove: props.stove.id,
  });
  picked.value = [];
}
const liftOrder = ref<number | null>(null);
const targetOrders = computed(() =>
  props.game.orders.filter(
    (o) =>
      o.status === "accepted" &&
      props.stove.batch &&
      o.recipe === props.stove.batch.recipe,
  ),
);
// 换锅或换了一批料后，旧的起锅目标订单可能已经失效，重置避免误拦。
watch(
  () => props.stove.batch?.id ?? null,
  () => {
    liftOrder.value = null;
  },
);
</script>
<template>
  <article class="stove" :class="{ cooking: stove.batch }">
    <div class="stove-head">
      <b>{{ stationName[stove.kind] }} 0{{ stove.id }}</b
      ><span class="status-dot">{{ heatLabel(game, stove) }}</span>
    </div>
    <div class="burner">
      <div class="pan-shape">
        <span>{{
          stove.batch ? recipes[stove.batch.recipe].icon : "＋"
        }}</span>
      </div>
      <div v-if="stove.batch" class="flame">♨ ♨ ♨</div>
    </div>
    <template v-if="stove.batch">
      <strong>{{ recipes[stove.batch.recipe].name }}</strong>
      <p class="batch-weight">{{ formatGrams(stove.batch.weight) }} 在锅</p>
      <p class="timer">
        {{ (game.time - stove.batch.started).toFixed(1)
        }}<small> / {{ stove.batch.target }} 秒</small>
      </p>
      <div class="heat-track">
        <i
          :style="{
            width:
              Math.min(
                100,
                ((game.time - stove.batch.started) /
                  (stove.batch.target * 1.8)) *
                  100,
              ) + '%',
          }"
        ></i
        ><span></span>
      </div>
      <select
        v-if="targetOrders.length"
        v-model="liftOrder"
        class="tiny target-select"
        aria-label="起锅目标订单"
      >
        <option :value="null">整锅起锅（不预分份）</option>
        <option v-for="o in targetOrders" :key="o.id" :value="o.id">
          先切给 #{{ o.id }}（{{ requiredWeight(o.recipe, o.size) }}g）
        </option>
      </select>
      <button
        class="warm"
        @click="
          $emit('command', {
            type: 'lift',
            id: stove.id,
            order: liftOrder,
          })
        "
      >
        起锅
      </button>
    </template>
    <template v-else>
      <p class="muted stove-hint">可用净料 {{ formatGrams(pickedWeight) }}</p>
      <div class="portion-picker">
        <button
          v-for="p in candidates"
          :key="p.id"
          class="tiny"
          :class="picked.includes(p.id) ? '' : 'soft'"
          @click="toggle(p.id)"
        >
          {{ recipes[p.recipe].icon }} #{{ p.id }} · {{ p.weight }}g
          {{ picked.includes(p.id) ? "✓" : "" }}
        </button>
        <small v-if="!candidates.length">先到备料台准备食材</small>
        <small v-else-if="pickedWeight" class="muted">
          预计火候 {{ formatTime(expectedTarget) }}
        </small>
        <small v-if="mixIssue" class="red">{{ mixIssue }}</small>
      </div>
      <button
        v-if="candidates.length"
        class="tiny soft cook-button"
        :disabled="!pickedWeight || !!mixIssue"
        @click="cook"
      >
        下锅合做
      </button>
    </template>
  </article>
</template>
