<script setup lang="ts">
import type { EffectMode } from '@energy-studio/core';
defineProps<{ mode: EffectMode }>();
const rows = Array.from({ length: 12 }, (_, i) => 10 + i * 2.6);
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
    <template v-else>
      <line x1="25" y1="5" x2="25" y2="43" stroke-width="1.4" />
      <path
        v-for="y in rows"
        :key="y"
        :d="`M25 ${24 + (y - 24) * 0.55} Q33 ${24 + (y - 24) * 0.7} 40 ${24 + (y - 24) * 1.05}`"
        stroke-width="0.9"
      />
    </template>
  </svg>
</template>
