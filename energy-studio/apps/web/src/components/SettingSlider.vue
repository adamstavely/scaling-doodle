<script setup lang="ts">
import { computed } from 'vue';

/**
 * A Trench Coat slider field bound to a setting. `scale` shows a 0..1 setting as 0..100 (a percentage), so the
 * slider's number box reads naturally; the model keeps the setting's own units.
 */
const props = withDefaults(
  defineProps<{ label: string; min?: number; max?: number; step?: number; scale?: number; description?: string }>(),
  { min: 0, max: 100, step: 1, scale: 1, description: '' },
);
const model = defineModel<number>({ required: true });
const shown = computed(() => Math.round(model.value * props.scale * 1000) / 1000);

function change(e: CustomEvent<{ value: number | string | null }>) {
  const v = Number(e.detail.value);
  if (e.detail.value === null || e.detail.value === '' || !Number.isFinite(v)) return;
  model.value = Math.min(props.max, Math.max(props.min, v)) / props.scale;
}
</script>

<template>
  <tc-slider-field
    :label="label"
    :description="description"
    :min="min"
    :max="max"
    :step="step"
    :value="shown"
    @tc-value-change="change"
  />
</template>
