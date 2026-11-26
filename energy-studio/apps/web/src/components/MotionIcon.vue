<script setup lang="ts">
import type { MotionType } from '@energy-studio/core';
defineProps<{ type: MotionType }>();
</script>

<template>
  <svg viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="currentColor" aria-hidden="true">
    <rect x="5" y="5" width="38" height="38" stroke-width="1.4" />
    <template v-if="type === 'sweep'">
      <line x1="24" y1="5" x2="24" y2="43" stroke-width="1.4" />
      <path d="M12 24h24M12 24l4-4M12 24l4 4M36 24l-4-4M36 24l-4 4" stroke-width="1.2" />
    </template>
    <template v-else-if="type === 'flow'">
      <path
        v-for="i in 7"
        :key="i"
        :d="`M8 ${9 + i * 4} C16 ${7 + i * 4}, 24 ${11 + i * 4}, 40 ${9 + i * 4}`"
        stroke-width="0.9"
      />
    </template>
    <template v-else>
      <circle cx="24" cy="24" r="4" stroke-width="1.2" />
      <circle cx="24" cy="24" r="9" stroke-width="0.9" />
      <circle cx="24" cy="24" r="14" stroke-width="0.7" stroke-dasharray="2 2" />
    </template>
  </svg>
</template>
