<script setup lang="ts">
import { ref, watch } from 'vue';
import { state } from '@/lib/state';

const dialog = ref<HTMLDialogElement>();
watch(
  () => state.showGuidance,
  (open) => (open ? dialog.value?.showModal() : dialog.value?.close()),
);
</script>

<template>
  <dialog ref="dialog" class="guidance" aria-labelledby="guidance-title" @close="state.showGuidance = false" @click.self="state.showGuidance = false">
    <div class="inner">
      <h2 id="guidance-title">Guidance</h2>
      <ol>
        <li>
          <strong>Pick a strong axis line.</strong> Every streak is a single row or column of the photo pulled
          across the frame, so place the axis where colour changes a lot: horizons, edges of a subject, light sources.
          Drag on the image or use the Axis Position slider.
        </li>
        <li>
          <strong>Choose the affected area.</strong> Left / right streak horizontally; top / bottom streak vertically;
          full frame streaks out from the axis on both sides.
        </li>
        <li>
          <strong>Shape the streaks with Mode.</strong> Straight is clean and graphic, Angle tilts the trails for a sense
          of speed, Flare fans them out from the centre.
        </li>
        <li><strong>Blending</strong> softens the seam between the untouched image and the streaks.</li>
        <li>
          <strong>Motion settings</strong> animate the effect: Sweep moves the edge, Flow streams the colours while the edge
          holds, Pulse breathes the streaks. Download a looping video when you're happy.
        </li>
        <li>
          Downloads are rendered at full resolution (up to 4096&nbsp;px on the long edge). Use the crop presets to match
          the channel you're publishing to.
        </li>
      </ol>
      <button type="button" class="close" @click="state.showGuidance = false">Got it</button>
    </div>
  </dialog>
</template>

<style scoped>
.guidance {
  border: none;
  border-radius: 20px;
  padding: 0;
  max-width: 560px;
  width: calc(100% - 32px);
  color: var(--ink);
  background: var(--card);
  box-shadow: 0 40px 80px -20px rgba(10, 6, 60, 0.5);
}
.guidance::backdrop {
  background: rgba(8, 6, 40, 0.45);
  backdrop-filter: blur(4px);
}
.inner {
  padding: 28px 32px;
}
h2 {
  margin: 0 0 16px;
  font-family: var(--display);
  color: var(--brand);
  font-size: 28px;
}
ol {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 10px;
  font-size: 14px;
  line-height: 1.5;
}
.close {
  margin-top: 22px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 10px 22px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
</style>
