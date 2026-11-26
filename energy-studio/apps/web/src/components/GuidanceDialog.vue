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
  <li>
    <strong>Blending</strong> softens the seam between the untouched image and the streaks; <strong>Streak length</strong>
    and <strong>Fade out</strong> let the photo show again further along.
  </li>
  <li>
    <strong>Protect the subject.</strong> Find subject (or paint a mask) keeps a person or product in front of the
    streaks. The Colour tab tints and lights the streaks; the Presets tab has ready-made looks and Surprise me.
  </li>
  <li>
    <strong>Motion settings</strong> animate the effect: Sweep moves the edge, Flow streams the colours while the edge
    holds, Pulse breathes the streaks. Download a looping video when you're happy.
  </li>
  <li>
    Downloads are rendered at full resolution (up to 4096&nbsp;px on the long edge). Export… also makes every social
    size in one zip, the streaks alone on transparency, and GIF or animated WebP.
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
    @tc-open-change.self="(e: CustomEvent<{ open: boolean }>) => (state.showGuidance = e.detail.open)"
  />
</template>
