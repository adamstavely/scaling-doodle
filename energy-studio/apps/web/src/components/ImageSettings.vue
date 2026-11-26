<script setup lang="ts">
import type { AffectedArea, AspectPreset, EffectMode } from '@energy-studio/core';
import { ArrowLeftRight } from 'lucide-vue-next';
import { state } from '@/lib/state';
import AreaIcon from './AreaIcon.vue';
import ModeIcon from './ModeIcon.vue';
import OptionTile from './OptionTile.vue';
import SettingSlider from './SettingSlider.vue';

const aspects: { value: AspectPreset; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: '16:9', label: '16:9' },
  { value: '4:5', label: '4:5' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: 'custom', label: 'Custom' },
];
const modes: { value: EffectMode; label: string }[] = [
  { value: 'angle', label: 'Angle' },
  { value: 'straight', label: 'Straight' },
  { value: 'flare', label: 'Flare' },
];
const areas: { value: AffectedArea; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'left', label: 'Left' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'right', label: 'Right' },
  { value: 'full', label: 'Full frame' },
];

type SizeKey = 'customWidth' | 'customHeight';
const MIN_SIZE = 16;
const MAX_SIZE = 8192;

function setSize(key: SizeKey, e: CustomEvent<{ value: number | null }>) {
  const v = Number(e.detail.value);
  // Keep typing free; out-of-range numbers are pulled back in when the field is left (see clampSize).
  if (e.detail.value !== null && Number.isFinite(v) && v > 0) state.aspect[key] = v;
}
function clampSize(key: SizeKey) {
  state.aspect[key] = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(state.aspect[key] || MIN_SIZE)));
}
function swapCustom() {
  [state.aspect.customWidth, state.aspect.customHeight] = [state.aspect.customHeight, state.aspect.customWidth];
}
</script>

<template>
  <div class="settings">
    <section class="group">
      <h3 class="es-heading">Aspect ratio</h3>
      <tc-segmented-control
        variant="buttons"
        size="sm"
        aria-label="Aspect ratio"
        :options="aspects"
        :value="state.aspect.preset"
        @tc-value-change="(e: CustomEvent<{ value: AspectPreset }>) => (state.aspect.preset = e.detail.value)"
      />
      <div v-if="state.aspect.preset === 'custom'" class="custom">
        <tc-number-field
          class="dimension"
          label="Width (px)"
          :min="MIN_SIZE"
          :max="MAX_SIZE"
          :value="state.aspect.customWidth"
          @tc-value-change="(e: CustomEvent<{ value: number | null }>) => setSize('customWidth', e)"
          @change="clampSize('customWidth')"
        />
        <tc-button variant="ghost" size="sm" hide-label label="Swap width and height" @click="swapCustom">
          <ArrowLeftRight slot="icon" />
        </tc-button>
        <tc-number-field
          class="dimension"
          label="Height (px)"
          :min="MIN_SIZE"
          :max="MAX_SIZE"
          :value="state.aspect.customHeight"
          @tc-value-change="(e: CustomEvent<{ value: number | null }>) => setSize('customHeight', e)"
          @change="clampSize('customHeight')"
        />
      </div>
    </section>

    <section class="group">
      <h3 class="es-heading">Mode</h3>
      <div class="tiles tiles--3">
        <OptionTile
          v-for="m in modes"
          :key="m.value"
          class="mode"
          :selected="state.effect.mode === m.value"
          :label="m.label"
          @select="state.effect.mode = m.value"
        >
          <ModeIcon :mode="m.value" />
          <span>{{ m.label }}</span>
        </OptionTile>
      </div>
      <SettingSlider
        v-if="state.effect.mode === 'angle'"
        v-model="state.effect.angle"
        label="Angle (°)"
        :min="-60"
        :max="60"
      />
      <SettingSlider v-else-if="state.effect.mode === 'flare'" v-model="state.effect.flare" label="Flare (%)" :scale="100" />
    </section>

    <section class="group">
      <h3 class="es-heading">Affected area</h3>
      <div class="tiles tiles--5">
        <OptionTile
          v-for="a in areas"
          :key="a.value"
          :selected="state.effect.area === a.value"
          :label="a.label"
          @select="state.effect.area = a.value"
        >
          <AreaIcon :area="a.value" />
        </OptionTile>
      </div>
    </section>

    <SettingSlider v-model="state.effect.axis" label="Axis position (%)" :scale="100" />
    <SettingSlider v-model="state.effect.blending" label="Blending (%)" :scale="100" />
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
.custom {
  display: flex;
  align-items: flex-end;
  gap: var(--tc-space-2);
}
.dimension {
  width: var(--es-size-dimension-field);
}
.tiles {
  display: grid;
  gap: var(--es-space-tile-gap);
}
.tiles--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.tiles--5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
.mode {
  aspect-ratio: 1;
}
</style>
