<script setup lang="ts">
import type { EffectMode } from '@energy-studio/core';
// Diagrams of what each mode does to the picture (content, not interface icons), in one shared line style.
defineProps<{ mode: EffectMode }>();
const rows = Array.from({ length: 12 }, (_, i) => 10 + i * 2.6);
const rays = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);
</script>

<template>
  <svg viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="currentColor" aria-hidden="true">
    <rect x="5" y="5" width="38" height="38" stroke-width="1.4" />
    <template v-if="mode === 'straight'">
      <line x1="25" y1="5" x2="25" y2="43" stroke-width="1.4" />
      <line v-for="y in rows" :key="y" x1="25" :x2="40" :y1="y" :y2="y" stroke-width="0.9" />
    </template>
    <template v-else-if="mode === 'angle'">
      <line x1="5" y1="43" x2="43" y2="5" stroke-width="0.9" />
      <line v-for="y in rows" :key="y" :x1="48 - y" :y1="y" x2="40" :y2="y" stroke-width="0.9" />
    </template>
    <template v-else-if="mode === 'flare'">
      <line x1="25" y1="5" x2="25" y2="43" stroke-width="1.4" />
      <path
        v-for="y in rows"
        :key="y"
        :d="`M25 ${24 + (y - 24) * 0.55} Q33 ${24 + (y - 24) * 0.7} 40 ${24 + (y - 24) * 1.05}`"
        stroke-width="0.9"
      />
    </template>
    <template v-else-if="mode === 'wave'">
      <line x1="25" y1="5" x2="25" y2="43" stroke-width="1.4" />
      <path v-for="y in rows" :key="y" :d="`M25 ${y} q3.75 -2 7.5 0 t7.5 0`" stroke-width="0.9" />
    </template>
    <template v-else-if="mode === 'mirror'">
      <line x1="24" y1="5" x2="24" y2="43" stroke-width="1.4" />
      <path d="M10 34 L16 16 L21 34" stroke-width="1.2" />
      <path d="M38 34 L32 16 L27 34" stroke-width="1.2" stroke-dasharray="2 1.5" />
    </template>
    <template v-else>
      <circle cx="24" cy="24" r="6" stroke-width="1.4" />
      <line
        v-for="a in rays"
        :key="a"
        :x1="24 + Math.cos(a) * 8"
        :y1="24 + Math.sin(a) * 8"
        :x2="24 + Math.cos(a) * 17"
        :y2="24 + Math.sin(a) * 17"
        stroke-width="0.9"
      />
    </template>
  </svg>
</template>
