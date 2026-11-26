<script setup lang="ts">
import { applyEnergy, normalizeEffect, DEFAULT_EFFECT, type EffectParams } from '@energy-studio/core';
import { Save, Shuffle, Trash2 } from 'lucide-vue-next';
import { ref, toRaw, watch } from 'vue';
import { BUILT_IN_LOOKS, deleteLook, saveLook, savedLooks, surpriseLook, type Look } from '@/lib/presets';
import { prepareBase } from '@/lib/render';
import { applyLook, source, state } from '@/lib/state';
import TextField from './TextField.vue';

/** Thumbnails of each look applied to the current image, as data URLs by look id. */
const thumbs = ref<Record<string, string>>({});
const name = ref('');

const THUMB_EDGE = 220;

function renderThumbs(looks: Look[]) {
  const src = source.value;
  if (!src) return;
  const base = prepareBase(src, { ...toRaw(state.aspect) }, THUMB_EDGE);
  const canvas = document.createElement('canvas');
  canvas.width = base.width;
  canvas.height = base.height;
  const ctx = canvas.getContext('2d')!;
  const out = ctx.createImageData(base.width, base.height);
  const next = { ...thumbs.value };
  for (const look of looks) {
    const effect: EffectParams = normalizeEffect({ ...DEFAULT_EFFECT, ...look.effect });
    applyEnergy(base.data, base.width, base.height, effect, out.data);
    ctx.putImageData(out, 0, 0);
    next[look.id] = canvas.toDataURL('image/jpeg', 0.8);
  }
  thumbs.value = next;
}

watch(
  [source, () => state.aspect.preset, savedLooks],
  () => renderThumbs([...BUILT_IN_LOOKS, ...savedLooks.value]),
  { immediate: true },
);

function apply(look: Look) {
  applyLook(look);
}
function surprise() {
  applyLook(surpriseLook(state.effect));
}
function save() {
  saveLook(name.value, toRaw(state.effect), toRaw(state.motion));
  name.value = '';
}
</script>

<template>
  <div class="settings">
    <section class="group">
      <div class="head">
        <h3 class="es-heading">Looks</h3>
        <tc-button variant="secondary" size="sm" label="Surprise me" @click="surprise">
          <Shuffle slot="icon" />
        </tc-button>
      </div>
      <p v-if="!source" class="es-note">Add an image to see each look on it.</p>
      <div class="grid">
        <button v-for="look in BUILT_IN_LOOKS" :key="look.id" type="button" class="look" @click="apply(look)">
          <img v-if="thumbs[look.id]" :src="thumbs[look.id]" alt="" class="thumb" />
          <span v-else class="thumb thumb--empty" />
          <span class="look-name">{{ look.name }}</span>
        </button>
      </div>
    </section>

    <section class="group">
      <h3 class="es-heading">Your looks</h3>
      <div class="save">
        <TextField v-model="name" label="Name" placeholder="My look" @enter="save" />
        <tc-button variant="primary" size="md" label="Save current look" @click="save">
          <Save slot="icon" />
        </tc-button>
      </div>
      <p v-if="!savedLooks.length" class="es-note">Looks you save are kept in this browser.</p>
      <div class="grid">
        <div v-for="look in savedLooks" :key="look.id" class="saved">
          <button type="button" class="look" @click="apply(look)">
            <img v-if="thumbs[look.id]" :src="thumbs[look.id]" alt="" class="thumb" />
            <span v-else class="thumb thumb--empty" />
            <span class="look-name">{{ look.name }}</span>
          </button>
          <tc-button class="delete" variant="ghost" size="sm" hide-label :label="`Delete ${look.name}`" @click="deleteLook(look.id)">
            <Trash2 slot="icon" />
          </tc-button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: grid;
  gap: var(--es-space-section);
}
.group {
  display: grid;
  gap: var(--es-space-field);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--es-space-tile-gap);
}
.look {
  display: grid;
  gap: var(--tc-space-1-5);
  width: 100%;
  padding: var(--tc-space-1-5);
  border: none;
  border-radius: var(--es-radius-tile);
  background: var(--es-color-tile);
  box-shadow: var(--es-shadow-tile);
  color: var(--tc-text-primary);
  font: inherit;
  font-size: var(--es-font-tile-size);
  text-align: left;
  cursor: pointer;
  transition: box-shadow var(--es-motion-tile-duration) var(--es-motion-tile-ease);
}
.look:hover {
  box-shadow: var(--es-shadow-tile-hover);
}
.look:focus-visible {
  outline: var(--tc-focus-outline);
  outline-offset: var(--tc-focus-ring-offset);
}
.thumb {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: var(--tc-radius-md);
  background: var(--tc-fill-default);
}
.look-name {
  padding: 0 var(--tc-space-1);
  font-weight: var(--tc-font-weight-medium);
}
.saved {
  position: relative;
}
.delete {
  position: absolute;
  top: var(--tc-space-2);
  right: var(--tc-space-2);
}
.save {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--tc-space-2);
}
</style>
