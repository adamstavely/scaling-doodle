<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    min?: number;
    max?: number;
    step?: number;
    /** Formats the value shown on the right. Defaults to a percentage of 0..1. */
    format?: (v: number) => string;
  }>(),
  { min: 0, max: 1, step: 0.01 },
);
const model = defineModel<number>({ required: true });
const id = useId();
const display = computed(() => (props.format ? props.format(model.value) : `${Math.round(model.value * 100)}%`));
const fill = computed(() => `${((model.value - props.min) / (props.max - props.min)) * 100}%`);
</script>

<template>
  <div class="slider">
    <div class="slider__head">
      <label :for="id">{{ label }}</label>
      <output :for="id">{{ display }}</output>
    </div>
    <input
      :id="id"
      v-model.number="model"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :style="{ '--fill': fill }"
    />
  </div>
</template>

<style scoped>
.slider {
  display: grid;
  gap: 6px;
}
.slider__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
label {
  font-size: 15px;
  color: var(--ink);
}
output {
  font-size: 12px;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  background: transparent;
  cursor: pointer;
  margin: 0;
}
input[type='range']::-webkit-slider-runnable-track {
  height: 1.5px;
  background: linear-gradient(var(--brand), var(--brand)) 0 / var(--fill) 100% no-repeat, var(--line-strong);
}
input[type='range']::-moz-range-track {
  height: 1.5px;
  background: var(--line-strong);
}
input[type='range']::-moz-range-progress {
  height: 1.5px;
  background: var(--brand);
}
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  margin-top: -8.25px;
  background: var(--brand);
  border: none;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  transition: transform 0.12s ease;
}
input[type='range']::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: var(--brand);
  border: none;
  border-radius: 0;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
input[type='range']:active::-webkit-slider-thumb {
  transform: scale(1.2);
}
input[type='range']:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 4px;
  border-radius: 4px;
}
</style>
