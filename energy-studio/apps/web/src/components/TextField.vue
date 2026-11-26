<script setup lang="ts">
import { useId } from 'vue';

/**
 * A one-line text input. Trench Coat has no plain text field, so this is a native input dressed in Trench Coat's
 * field tokens (--tc-field-*), matching its number and slider fields.
 */
defineProps<{ label: string; placeholder?: string; type?: string; hideLabel?: boolean }>();
const model = defineModel<string>({ required: true });
const emit = defineEmits<{ enter: [] }>();
const id = useId();
</script>

<template>
  <div class="field">
    <label :for="id" :class="{ 'es-visually-hidden': hideLabel }">{{ label }}</label>
    <input :id="id" v-model="model" :type="type ?? 'text'" :placeholder="placeholder" @keydown.enter.prevent="emit('enter')" />
  </div>
</template>

<style scoped>
.field {
  display: grid;
  gap: var(--tc-space-1-5);
  min-width: 0;
}
label {
  font-size: var(--tc-font-size-md);
  color: var(--tc-text-secondary);
}
input {
  height: var(--tc-field-h);
  padding: 0 var(--tc-field-px);
  border: none;
  border-radius: var(--tc-field-radius);
  background: var(--tc-field-bg);
  box-shadow: var(--tc-field-shadow);
  color: var(--tc-text-primary);
  font: inherit;
  font-size: var(--tc-field-font-size);
  min-width: 0;
}
input::placeholder {
  color: var(--tc-text-placeholder);
}
input:hover {
  box-shadow: var(--tc-field-shadow-hover);
}
input:focus-visible {
  outline: none;
  box-shadow: var(--tc-field-shadow-focus);
}
</style>
