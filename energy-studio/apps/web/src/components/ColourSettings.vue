<script setup lang="ts">
import { ref } from 'vue';
import { state } from '@/lib/state';
import SettingSlider from './SettingSlider.vue';

type End = 'tintStart' | 'tintEnd';
const ends: { value: End; label: string }[] = [
  { value: 'tintStart', label: 'At the axis' },
  { value: 'tintEnd', label: 'At the far end' },
];
const editing = ref<End>('tintStart');

// The picker's swatches: colours that read well as light trails.
const swatches = ['#5b8cff', '#2ee6ff', '#7cff6b', '#ffd54a', '#ff6a00', '#ff3b2f', '#ff3fd2', '#a35bff', '#ffffff'];

function pick(e: CustomEvent<{ value: string }>) {
  // The picker may hand back #rrggbbaa; the effect takes #rrggbb.
  state.effect[editing.value] = e.detail.value.slice(0, 7);
}
</script>

<template>
  <div class="settings">
    <section class="group">
      <h3 class="es-heading">Streak colour</h3>
      <SettingSlider v-model="state.effect.hue" label="Hue shift (°)" :min="-180" :max="180" />
      <SettingSlider v-model="state.effect.saturation" label="Saturation (%)" :max="200" :scale="100" />
      <SettingSlider
        v-model="state.effect.glow"
        label="Glow (%)"
        :scale="100"
        description="Brightens the streaks where they leave the axis."
      />
    </section>

    <section class="group">
      <h3 class="es-heading">Tint</h3>
      <SettingSlider
        v-model="state.effect.tintAmount"
        label="Tint strength (%)"
        :scale="100"
        description="Colours the streaks with a gradient from the axis to their far end, keeping their light and shade."
      />
      <div class="gradient" :class="{ off: !state.effect.tintAmount }">
        <span class="swatch" :style="{ '--swatch': state.effect.tintStart }" />
        <span class="ramp" :style="{ '--from': state.effect.tintStart, '--to': state.effect.tintEnd }" />
        <span class="swatch" :style="{ '--swatch': state.effect.tintEnd }" />
      </div>
      <tc-segmented-control
        size="sm"
        full-width
        aria-label="Which end of the tint to change"
        :options="ends"
        :value="editing"
        @tc-value-change="(e: CustomEvent<{ value: End }>) => (editing = e.detail.value)"
      />
      <tc-color-picker
        :heading="editing === 'tintStart' ? 'Tint at the axis' : 'Tint at the far end'"
        :value="state.effect[editing]"
        :swatches="swatches"
        @tc-value-change="pick"
      />
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: grid;
  gap: var(--es-space-section);
}
.group {
  display: grid;
  gap: var(--es-space-field);
}
.gradient {
  display: flex;
  align-items: center;
  gap: var(--tc-space-2);
  transition: opacity var(--tc-duration-base) var(--tc-ease-standard);
}
.gradient.off {
  opacity: var(--es-effect-disabled-opacity);
}
.swatch {
  flex: none;
  width: var(--es-size-swatch);
  height: var(--es-size-swatch);
  border-radius: var(--tc-radius-full);
  background: var(--swatch);
  box-shadow: var(--tc-shadow-control);
}
.ramp {
  flex: 1;
  height: var(--es-size-ramp);
  border-radius: var(--tc-radius-full);
  background: linear-gradient(to right, var(--from), var(--to));
  box-shadow: var(--tc-shadow-control);
}
</style>
