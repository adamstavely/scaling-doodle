<script setup lang="ts">
import type { AffectedArea } from '@energy-studio/core';
defineProps<{ area: AffectedArea }>();
const h = [5, 8, 11, 14, 17, 20, 23, 26];
const v = [5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
</script>

<template>
  <svg viewBox="0 0 40 31" width="44" height="34" fill="none" stroke="currentColor" aria-hidden="true">
    <rect x="1.5" y="1.5" width="37" height="28" stroke-width="1.3" />
    <template v-if="area === 'top' || area === 'bottom'">
      <line x1="1.5" y1="15.5" x2="38.5" y2="15.5" stroke-width="1.6" />
      <line
        v-for="x in v"
        :key="x"
        :x1="x"
        :x2="x"
        :y1="area === 'top' ? 2 : 15.5"
        :y2="area === 'top' ? 15.5 : 29"
        stroke-width="0.8"
      />
    </template>
    <template v-else>
      <line v-if="area !== 'full'" x1="20" y1="1.5" x2="20" y2="29.5" stroke-width="1.6" />
      <line
        v-for="y in h"
        :key="y"
        :x1="area === 'right' ? 20 : 2"
        :x2="area === 'left' ? 20 : 38"
        :y1="y"
        :y2="y"
        stroke-width="0.8"
      />
    </template>
  </svg>
</template>
