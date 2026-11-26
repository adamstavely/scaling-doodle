<script setup lang="ts">
import { html } from 'lit';
import { state } from '@/lib/state';

// The dialog renders its body itself (a Lit template); the list's look comes from .es-guidance in styles/base.css.
const content = html`<ol class="es-guidance">
  <li>
    <strong>Pick a strong axis line.</strong> Every streak is a single row or column of the photo pulled across the
    frame, so place the axis where colour changes a lot: horizons, edges of a subject, light sources. Drag on the image
    or use the Axis position slider.
  </li>
  <li>
    <strong>Choose the affected area.</strong> Left / right streak horizontally; top / bottom streak vertically; full
    frame streaks out from the axis on both sides.
  </li>
  <li>
    <strong>Shape the streaks with Mode.</strong> Straight is clean and graphic, Angle tilts the trails for a sense of
    speed, Flare fans them out from the centre.
  </li>
  <li><strong>Blending</strong> softens the seam between the untouched image and the streaks.</li>
  <li>
    <strong>Motion settings</strong> animate the effect: Sweep moves the edge, Flow streams the colours while the edge
    holds, Pulse breathes the streaks. Download a looping video when you're happy.
  </li>
  <li>
    Downloads are rendered at full resolution (up to 4096&nbsp;px on the long edge). Use the aspect ratio presets to
    match the channel you're publishing to.
  </li>
</ol>`;
</script>

<template>
  <tc-dialog
    label="Guidance"
    description="How to get the most out of Energy Studio"
    close-label="Got it"
    :open="state.showGuidance"
    :content="content"
    @tc-open-change="(e: CustomEvent<{ open: boolean }>) => (state.showGuidance = e.detail.open)"
  />
</template>
