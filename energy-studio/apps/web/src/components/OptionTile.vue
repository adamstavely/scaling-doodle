<script setup lang="ts">
defineProps<{ selected: boolean; label?: string; variant?: 'fill' | 'outline' }>();
defineEmits<{ select: [] }>();
</script>

<template>
  <button
    type="button"
    class="tile"
    :class="[variant ?? 'outline', { selected }]"
    :aria-pressed="selected"
    :title="label"
    @click="$emit('select')"
  >
    <slot />
  </button>
</template>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1.5px solid transparent;
  border-radius: 14px;
  background: var(--tile);
  color: var(--ink);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 6px 16px -12px rgba(20, 16, 80, 0.4);
  transition: background 0.15s, border-color 0.15s, transform 0.1s, color 0.15s;
}
.tile:hover {
  background: var(--tile-hover);
}
.tile:active {
  transform: scale(0.97);
}
.tile:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
.outline.selected {
  border-color: var(--ink);
  background: var(--tile-selected);
}
.fill.selected {
  background: var(--brand);
  color: #fff;
  box-shadow: 0 8px 20px -10px var(--brand);
}
</style>
