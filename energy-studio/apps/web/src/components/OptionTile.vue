<script setup lang="ts">
/** A picture tile in a row of choices (mode, affected area, motion). Pressed when it's the current choice. */
defineProps<{ selected: boolean; label?: string }>();
defineEmits<{ select: [] }>();
</script>

<template>
  <button type="button" class="tile" :class="{ selected }" :aria-pressed="selected" :title="label" @click="$emit('select')">
    <slot />
  </button>
</template>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--tc-space-1-5);
  padding: var(--tc-space-2);
  border: none;
  border-radius: var(--es-radius-tile);
  background: var(--es-color-tile);
  box-shadow: var(--es-shadow-tile);
  color: var(--tc-text-secondary);
  font: inherit;
  font-size: var(--es-font-tile-size);
  font-weight: var(--tc-font-weight-medium);
  cursor: pointer;
  transition:
    box-shadow var(--es-motion-tile-duration) var(--es-motion-tile-ease),
    color var(--es-motion-tile-duration) var(--es-motion-tile-ease),
    background var(--es-motion-tile-duration) var(--es-motion-tile-ease),
    transform var(--es-motion-tile-duration) var(--es-motion-tile-ease);
}
.tile:hover {
  box-shadow: var(--es-shadow-tile-hover);
  color: var(--tc-text-primary);
}
.tile:active {
  transform: scale(var(--es-motion-tile-press-scale));
}
.tile:focus-visible {
  outline: var(--tc-focus-outline);
  outline-offset: var(--tc-focus-ring-offset);
}
.tile.selected {
  background: var(--es-color-tile-selected);
  box-shadow: inset 0 0 0 var(--tc-focus-ring-width) var(--es-color-tile-selected-border);
  color: var(--es-color-tile-selected-text);
}
</style>
