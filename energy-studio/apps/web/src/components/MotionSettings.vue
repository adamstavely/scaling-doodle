<script setup lang="ts">
import { keyframeOf, type MotionParams, type MotionType } from '@energy-studio/core';
import { Activity, Diamond, MoveHorizontal, Pause, Play, TriangleAlert, Waves } from 'lucide-vue-next';
import { computed, type Component } from 'vue';
import { supportedVideoType } from '@/lib/render';
import { applyLook, state } from '@/lib/state';
import OptionTile from './OptionTile.vue';
import SettingSlider from './SettingSlider.vue';

const types: { value: MotionType; label: string; hint: string; icon: Component }[] = [
  { value: 'sweep', label: 'Sweep', hint: 'The axis travels across the frame', icon: MoveHorizontal },
  { value: 'flow', label: 'Flow', hint: 'Streak colours stream while the edge holds still', icon: Waves },
  { value: 'pulse', label: 'Pulse', hint: 'The streaks breathe in and out', icon: Activity },
  { value: 'keyframes', label: 'Keyframes', hint: 'Moves from a start look to an end look that you set', icon: Diamond },
];
const loops: { value: MotionParams['loop']; label: string }[] = [
  { value: 'pingpong', label: 'Ping-pong' },
  { value: 'loop', label: 'Loop' },
];
const sizes = [
  { value: '720', label: '720 px' },
  { value: '1280', label: '1280 px' },
  { value: '1920', label: '1920 px' },
];
const hint = computed(() => types.find((t) => t.value === state.motion.type)?.hint);
const videoLength = computed(() => `Video length ${(state.motion.duration * state.videoCycles).toFixed(1)} s`);
const canRecord = !!supportedVideoType();

type End = 'from' | 'to';
const keyframes = computed(() => state.motion.keyframes);

/** Captures the current look as the start or end of keyframed motion. */
function setKeyframe(end: End) {
  const k = keyframeOf(state.effect);
  const now = state.motion.keyframes ?? { from: k, to: k };
  state.motion.keyframes = { ...now, [end]: k };
}
/** Shows one end of the keyframes as the current look (to adjust it, then set it again). */
function goTo(end: End) {
  const k = state.motion.keyframes?.[end];
  if (!k) return;
  state.playing = false;
  applyLook({ effect: { ...state.effect, ...k } });
}
</script>

<template>
  <div class="settings">
    <section class="group">
      <div class="head">
        <h3 class="es-heading">Motion</h3>
        <tc-button
          variant="secondary"
          size="sm"
          :label="state.playing ? 'Pause preview' : 'Play preview'"
          :aria-pressed="state.playing"
          @click="state.playing = !state.playing"
        >
          <Pause v-if="state.playing" slot="icon" />
          <Play v-else slot="icon" />
        </tc-button>
      </div>
      <div class="tiles tiles--4">
        <OptionTile
          v-for="t in types"
          :key="t.value"
          class="type"
          :selected="state.motion.type === t.value"
          :label="t.hint"
          @select="state.motion.type = t.value"
        >
          <component :is="t.icon" class="type-icon" aria-hidden="true" />
          <span>{{ t.label }}</span>
        </OptionTile>
      </div>
      <p class="es-note">{{ hint }}</p>
    </section>

    <section v-if="state.motion.type === 'keyframes'" class="group keyframes">
      <p class="es-note">
        Set the start look, change any settings (axis, length, colour…), then set the end look. The preview plays between
        them.
      </p>
      <div v-for="end in (['from', 'to'] as const)" :key="end" class="keyframe">
        <span class="keyframe-name">
          <Diamond class="keyframe-icon" :class="{ set: keyframes?.[end] }" aria-hidden="true" />
          {{ end === 'from' ? 'Start' : 'End' }}
        </span>
        <tc-button variant="secondary" size="sm" :label="keyframes?.[end] ? 'Update' : 'Set to current'" @click="setKeyframe(end)" />
        <tc-button variant="ghost" size="sm" label="Show" :disabled="!keyframes?.[end]" @click="goTo(end)" />
      </div>
    </section>
    <SettingSlider v-else v-model="state.motion.amount" label="Intensity (%)" :scale="100" />
    <SettingSlider v-model="state.motion.duration" label="Cycle duration (s)" :min="1" :max="12" :step="0.5" />

    <section class="row">
      <tc-segmented-control
        size="sm"
        aria-label="Loop style"
        :options="loops"
        :value="state.motion.loop"
        @tc-value-change="(e: CustomEvent<{ value: MotionParams['loop'] }>) => (state.motion.loop = e.detail.value)"
      />
      <tc-switch
        label="Ease in / out"
        :value="state.motion.easing"
        @tc-value-change="(e: CustomEvent<{ value: boolean }>) => (state.motion.easing = e.detail.value)"
      />
    </section>

    <section class="group export">
      <h3 class="es-heading">Video export</h3>
      <SettingSlider v-model="state.videoCycles" label="Cycles" :min="1" :max="6" :description="videoLength" />
      <div class="group">
        <span id="long-edge" class="es-note">Long edge</span>
        <tc-segmented-control
          size="sm"
          aria-labelledby="long-edge"
          :options="sizes"
          :value="String(state.videoLongEdge)"
          @tc-value-change="(e: CustomEvent<{ value: string }>) => (state.videoLongEdge = Number(e.detail.value))"
        />
      </div>
      <p v-if="!canRecord" class="es-note warn">
        <TriangleAlert class="warn-icon" aria-hidden="true" />
        This browser can't record video. Try a recent Chrome, Edge, Firefox or Safari.
      </p>
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
.head,
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tc-space-3);
  flex-wrap: wrap;
}
.tiles {
  display: grid;
  gap: var(--es-space-tile-gap);
}
.tiles--4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.type {
  aspect-ratio: 1;
}
.keyframe {
  display: flex;
  align-items: center;
  gap: var(--tc-space-2);
}
.keyframe-name {
  display: inline-flex;
  align-items: center;
  gap: var(--tc-space-1-5);
  min-width: var(--es-size-keyframe-label);
  font-weight: var(--tc-font-weight-medium);
}
.keyframe-icon {
  width: var(--es-size-status-icon);
  height: var(--es-size-status-icon);
  color: var(--tc-icon-muted);
}
.keyframe-icon.set {
  color: var(--tc-accent);
  fill: currentColor;
}
.type-icon {
  width: var(--es-size-tile-icon);
  height: var(--es-size-tile-icon);
}
.export {
  padding-top: var(--es-space-section);
  border-top: var(--tc-hairline) solid var(--tc-border-strong);
}
.warn {
  display: flex;
  gap: var(--tc-space-1-5);
  color: var(--tc-status-warning-fg);
}
.warn-icon {
  flex: none;
  width: var(--es-size-status-icon);
  height: var(--es-size-status-icon);
  margin-top: var(--tc-space-0-5);
}
</style>
