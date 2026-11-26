<script setup lang="ts">
import { MAX_EXTRA_AXES, type AffectedArea, type AspectPreset, type EffectMode } from '@energy-studio/core';
import { ArrowLeftRight, Plus, X } from 'lucide-vue-next';
import { computed } from 'vue';
import { state } from '@/lib/state';
import AreaIcon from './AreaIcon.vue';
import ModeIcon from './ModeIcon.vue';
import OptionTile from './OptionTile.vue';
import SettingSlider from './SettingSlider.vue';
import SubjectControls from './SubjectControls.vue';

const aspects: { value: AspectPreset; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: '16:9', label: '16:9' },
  { value: '4:5', label: '4:5' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: 'custom', label: 'Custom' },
];
const modes: { value: EffectMode; label: string }[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'angle', label: 'Angle' },
  { value: 'flare', label: 'Flare' },
  { value: 'wave', label: 'Wave' },
  { value: 'mirror', label: 'Mirror' },
  { value: 'burst', label: 'Burst' },
];
const areas: { value: AffectedArea; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'left', label: 'Left' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'right', label: 'Right' },
  { value: 'full', label: 'Full frame' },
];
const burst = computed(() => state.effect.mode === 'burst');

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

function addAxis() {
  if (state.effect.extraAxes.length >= MAX_EXTRA_AXES) return;
  // Start on the opposite side of the main axis, so the new streaks are visible straight away.
  const opposite: Record<AffectedArea, AffectedArea> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top', full: 'full' };
  state.effect.extraAxes.push({ area: opposite[state.effect.area], axis: Math.min(0.9, Math.max(0.1, 1 - state.effect.axis)) });
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
      <SettingSlider v-if="state.effect.mode === 'angle'" v-model="state.effect.angle" label="Angle (°)" :min="-60" :max="60" />
      <SettingSlider v-else-if="state.effect.mode === 'flare'" v-model="state.effect.flare" label="Flare (%)" :scale="100" />
      <SettingSlider v-else-if="state.effect.mode === 'wave'" v-model="state.effect.wave" label="Wave (%)" :scale="100" />
      <p v-else-if="burst" class="es-note">Click the image to place the centre of the burst.</p>
    </section>

    <section v-if="!burst" class="group">
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

    <SettingSlider v-model="state.effect.axis" :label="burst ? 'Radius (%)' : 'Axis position (%)'" :scale="100" />
    <SettingSlider v-model="state.effect.blending" label="Blending (%)" :scale="100" />
    <SettingSlider
      v-model="state.effect.length"
      label="Streak length (%)"
      :min="5"
      :scale="100"
      description="How far the streaks reach before the photo shows again."
    />
    <SettingSlider v-model="state.effect.fade" label="Fade out (%)" :scale="100" />

    <section v-if="!burst" class="group">
      <div class="head">
        <h3 class="es-heading">More axes</h3>
        <tc-button
          variant="secondary"
          size="sm"
          label="Add axis"
          :disabled="state.effect.extraAxes.length >= MAX_EXTRA_AXES"
          @click="addAxis"
        >
          <Plus slot="icon" />
        </tc-button>
      </div>
      <p v-if="!state.effect.extraAxes.length" class="es-note">
        Streak from more than one line: both sides of a subject, or a horizontal and a vertical band together.
      </p>
      <div v-for="(axis, i) in state.effect.extraAxes" :key="i" class="axis">
        <div class="head">
          <tc-select
            :label="`Axis ${i + 2} area`"
            :options="areas"
            :value="axis.area"
            @tc-value-change="(e: CustomEvent<{ value: AffectedArea }>) => (axis.area = e.detail.value)"
          />
          <tc-button variant="ghost" size="sm" hide-label :label="`Remove axis ${i + 2}`" @click="state.effect.extraAxes.splice(i, 1)">
            <X slot="icon" />
          </tc-button>
        </div>
        <SettingSlider v-model="axis.axis" :label="`Axis ${i + 2} position (%)`" :scale="100" />
      </div>
    </section>

    <SubjectControls />
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
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tc-space-2);
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
.axis {
  display: grid;
  gap: var(--tc-space-2);
  padding: var(--tc-space-3);
  border-radius: var(--es-radius-tile);
  background: var(--es-color-tile);
  box-shadow: var(--es-shadow-tile);
}
</style>
