<script setup lang="ts">
import { Brush, Eraser, Eye, EyeOff, Trash2, WandSparkles } from 'lucide-vue-next';
import { computed } from 'vue';
import { detectSubject } from '@/lib/api';
import { clearMask, ensureMask, mask, setMaskFrom, state, type MaskTool } from '@/lib/state';
import SettingSlider from './SettingSlider.vue';

const tools: { value: MaskTool; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'paint', label: 'Paint' },
  { value: 'erase', label: 'Erase' },
];
const hasMask = computed(() => (state.maskVersion, !!mask.value));

function setTool(tool: MaskTool) {
  if (tool !== 'off') ensureMask();
  state.maskTool = tool;
  state.compare = false;
}

async function detect() {
  if (!state.imageId || state.detecting) return;
  state.detecting = true;
  state.error = null;
  try {
    const bitmap = await createImageBitmap(await detectSubject(state.imageId));
    setMaskFrom(bitmap);
    bitmap.close();
    state.showMask = true;
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e);
  } finally {
    state.detecting = false;
  }
}
</script>

<template>
  <section class="group">
    <h3 class="es-heading">Protect subject</h3>
    <p class="es-note">Keep a person or product in front of the streaks: find it automatically, or paint over it.</p>
    <div class="row">
      <tc-button
        variant="secondary"
        size="sm"
        :label="state.detecting ? 'Finding subject…' : 'Find subject'"
        :loading="state.detecting"
        :disabled="!state.imageId"
        :title="state.imageId ? undefined : 'Needs the server, which is not reachable'"
        @click="detect"
      >
        <WandSparkles slot="icon" />
      </tc-button>
      <tc-button v-if="hasMask" variant="ghost" size="sm" label="Clear" @click="clearMask">
        <Trash2 slot="icon" />
      </tc-button>
      <tc-button
        v-if="hasMask"
        variant="ghost"
        size="sm"
        :label="state.showMask ? 'Hide mask' : 'Show mask'"
        :aria-pressed="state.showMask"
        @click="state.showMask = !state.showMask"
      >
        <EyeOff v-if="state.showMask" slot="icon" />
        <Eye v-else slot="icon" />
      </tc-button>
    </div>
    <div class="row">
      <span id="brush-label" class="es-note">Brush</span>
      <tc-segmented-control
        size="sm"
        aria-labelledby="brush-label"
        :options="tools"
        :value="state.maskTool"
        @tc-value-change="(e: CustomEvent<{ value: MaskTool }>) => setTool(e.detail.value)"
      />
      <Brush v-if="state.maskTool === 'paint'" class="tool-icon" aria-hidden="true" />
      <Eraser v-else-if="state.maskTool === 'erase'" class="tool-icon" aria-hidden="true" />
    </div>
    <SettingSlider
      v-if="state.maskTool !== 'off'"
      v-model="state.brushSize"
      label="Brush size (%)"
      :min="1"
      :max="30"
      :scale="100"
      description="Paint on the image to protect it; Erase to let the streaks through again."
    />
  </section>
</template>

<style scoped>
.group {
  display: grid;
  gap: var(--es-space-field);
}
.row {
  display: flex;
  align-items: center;
  gap: var(--tc-space-2);
  flex-wrap: wrap;
}
.tool-icon {
  width: var(--es-size-status-icon);
  height: var(--es-size-status-icon);
  color: var(--tc-icon-muted);
}
</style>
