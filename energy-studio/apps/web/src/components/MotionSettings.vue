<script setup lang="ts">
import type { MotionType } from '@energy-studio/core';
import { computed } from 'vue';
import { supportedVideoType } from '@/lib/render';
import { state } from '@/lib/state';
import DiamondSlider from './DiamondSlider.vue';
import MotionIcon from './MotionIcon.vue';
import OptionTile from './OptionTile.vue';

const types: { value: MotionType; label: string; hint: string }[] = [
  { value: 'sweep', label: 'Sweep', hint: 'The axis travels across the frame' },
  { value: 'flow', label: 'Flow', hint: 'Streak colours stream while the edge holds still' },
  { value: 'pulse', label: 'Pulse', hint: 'The streaks breathe in and out' },
];
const hint = computed(() => types.find((t) => t.value === state.motion.type)?.hint);
const videoLength = computed(() => state.motion.duration * state.videoCycles);
const canRecord = !!supportedVideoType();
const sizes = [
  { value: 720, label: '720' },
  { value: 1280, label: '1280' },
  { value: 1920, label: '1920' },
];
</script>

<template>
  <div class="settings">
    <section>
      <div class="head">
        <h3>Motion</h3>
        <button type="button" class="play" :aria-pressed="state.playing" @click="state.playing = !state.playing">
          <svg v-if="state.playing" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
            <rect x="2" y="1" width="3" height="10" fill="currentColor" /><rect x="7" y="1" width="3" height="10" fill="currentColor" />
          </svg>
          <svg v-else viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 1l9 5-9 5z" fill="currentColor" /></svg>
          {{ state.playing ? 'Pause preview' : 'Play preview' }}
        </button>
      </div>
      <div class="row3">
        <OptionTile
          v-for="t in types"
          :key="t.value"
          class="mode"
          :selected="state.motion.type === t.value"
          :label="t.hint"
          @select="state.motion.type = t.value"
        >
          <MotionIcon :type="t.value" />
          <span class="caption">{{ t.label }}</span>
        </OptionTile>
      </div>
      <p class="hint">{{ hint }}</p>
    </section>

    <DiamondSlider v-model="state.motion.amount" label="Intensity" />
    <DiamondSlider
      v-model="state.motion.duration"
      label="Cycle Duration"
      :min="1"
      :max="12"
      :step="0.5"
      :format="(v) => `${v.toFixed(1)}s`"
    />

    <section class="toggles">
      <div class="seg" role="group" aria-label="Loop style">
        <button type="button" :class="{ on: state.motion.loop === 'pingpong' }" @click="state.motion.loop = 'pingpong'">
          Ping-pong
        </button>
        <button type="button" :class="{ on: state.motion.loop === 'loop' }" @click="state.motion.loop = 'loop'">Loop</button>
      </div>
      <label class="check">
        <input v-model="state.motion.easing" type="checkbox" />
        Ease in / out
      </label>
    </section>

    <section class="export">
      <h3>Video Export</h3>
      <DiamondSlider
        v-model="state.videoCycles"
        label="Cycles"
        :min="1"
        :max="6"
        :step="1"
        :format="(v) => `${v} × = ${videoLength.toFixed(1)}s`"
      />
      <div class="seg sizes" role="group" aria-label="Video size (long edge)">
        <span class="seg-label">Long edge</span>
        <button
          v-for="s in sizes"
          :key="s.value"
          type="button"
          :class="{ on: state.videoLongEdge === s.value }"
          @click="state.videoLongEdge = s.value"
        >
          {{ s.label }}
        </button>
      </div>
      <p v-if="!canRecord" class="warn">This browser can't record video. Try a recent Chrome, Edge, Firefox or Safari.</p>
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: grid;
  gap: 24px;
}
h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.play {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--brand);
  color: var(--brand);
  background: transparent;
  border-radius: 999px;
  padding: 5px 12px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.play[aria-pressed='true'] {
  background: var(--brand);
  color: #fff;
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
.hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--ink-soft);
  min-height: 1em;
}
.toggles {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.seg {
  display: inline-flex;
  align-items: center;
  background: var(--tile);
  border-radius: 999px;
  padding: 3px;
}
.seg button {
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  color: var(--ink-soft);
}
.seg button.on {
  background: var(--brand);
  color: #fff;
}
.seg-label {
  font-size: 12px;
  color: var(--ink-soft);
  padding: 0 8px 0 10px;
}
.check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}
.check input {
  accent-color: var(--brand);
  width: 16px;
  height: 16px;
}
.export {
  display: grid;
  gap: 16px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}
.sizes {
  justify-self: start;
}
.warn {
  margin: 0;
  font-size: 12px;
  color: #b3261e;
}
</style>
