<script setup lang="ts">
import type { AffectedArea, AspectPreset, EffectMode } from '@energy-studio/core';
import { state } from '@/lib/state';
import AreaIcon from './AreaIcon.vue';
import DiamondSlider from './DiamondSlider.vue';
import ModeIcon from './ModeIcon.vue';
import OptionTile from './OptionTile.vue';

const aspects: { value: AspectPreset; label: string; area: string }[] = [
  { value: 'original', label: 'Original Input', area: 'orig' },
  { value: '16:9', label: '16:9', area: 'wide' },
  { value: '4:5', label: '4:5', area: 'port' },
  { value: '9:16', label: '9:16', area: 'tall' },
  { value: '1:1', label: '1:1', area: 'sq' },
  { value: 'custom', label: 'Custom', area: 'custom' },
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

function clampSize(key: 'customWidth' | 'customHeight') {
  state.aspect[key] = Math.min(8192, Math.max(16, Math.round(state.aspect[key] || 16)));
}
function swapCustom() {
  [state.aspect.customWidth, state.aspect.customHeight] = [state.aspect.customHeight, state.aspect.customWidth];
}
</script>

<template>
  <div class="settings">
    <section aria-label="Aspect ratio">
      <div class="aspects">
        <OptionTile
          v-for="a in aspects"
          :key="a.value"
          variant="fill"
          :style="{ gridArea: a.area }"
          :selected="state.aspect.preset === a.value"
          :label="a.label"
          @select="state.aspect.preset = a.value"
        >
          <span class="aspect-label">{{ a.label }}</span>
        </OptionTile>
      </div>
      <div v-if="state.aspect.preset === 'custom'" class="custom">
        <label>
          <span>W</span>
          <input v-model.number="state.aspect.customWidth" type="number" min="16" max="8192" @change="clampSize('customWidth')" />
        </label>
        <button type="button" class="swap" title="Swap width and height" @click="swapCustom">⇄</button>
        <label>
          <span>H</span>
          <input v-model.number="state.aspect.customHeight" type="number" min="16" max="8192" @change="clampSize('customHeight')" />
        </label>
        <span class="px">px</span>
      </div>
    </section>

    <section>
      <h3>Mode</h3>
      <div class="row3">
        <OptionTile
          v-for="m in modes"
          :key="m.value"
          class="mode"
          :selected="state.effect.mode === m.value"
          :label="m.label"
          @select="state.effect.mode = m.value"
        >
          <ModeIcon :mode="m.value" />
          <span class="caption">{{ m.label }}</span>
        </OptionTile>
      </div>
      <DiamondSlider
        v-if="state.effect.mode === 'angle'"
        v-model="state.effect.angle"
        class="sub"
        label="Angle"
        :min="-60"
        :max="60"
        :step="1"
        :format="(v) => `${Math.round(v)}°`"
      />
      <DiamondSlider v-else-if="state.effect.mode === 'flare'" v-model="state.effect.flare" class="sub" label="Flare" />
    </section>

    <section>
      <h3>Affected Area</h3>
      <div class="row5">
        <OptionTile
          v-for="a in areas"
          :key="a.value"
          class="area"
          :selected="state.effect.area === a.value"
          :label="a.label"
          @select="state.effect.area = a.value"
        >
          <AreaIcon :area="a.value" />
        </OptionTile>
      </div>
    </section>

    <DiamondSlider v-model="state.effect.axis" label="Axis Position" />
    <DiamondSlider v-model="state.effect.blending" label="Blending" />
  </div>
</template>

<style scoped>
.settings {
  display: grid;
  gap: 22px;
}
h3 {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 500;
}
.aspects {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.2fr) minmax(0, 0.85fr) minmax(0, 0.8fr);
  grid-template-rows: 58px 50px;
  grid-template-areas:
    'orig wide port tall'
    'sq custom custom tall';
  gap: 10px;
}
.aspects :deep(.tile) {
  border-radius: 12px;
}
.aspect-label {
  font-size: 11.5px;
  line-height: 1.15;
  text-align: center;
  padding: 0 4px;
}
.custom {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
}
.custom label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-soft);
}
.custom input {
  width: 72px;
  padding: 6px 8px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--tile);
  font: inherit;
  color: var(--ink);
}
.swap {
  border: none;
  background: none;
  color: var(--brand);
  cursor: pointer;
  font-size: 16px;
}
.px {
  color: var(--ink-soft);
}
.row3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.mode {
  padding: 10px 6px 8px;
  aspect-ratio: 1 / 0.92;
}
.caption {
  font-size: 11px;
  align-self: flex-start;
  padding-left: 6px;
}
.row5 {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}
.area {
  padding: 8px 0;
  background: transparent;
  box-shadow: none;
}
.sub {
  margin-top: 14px;
}
</style>
