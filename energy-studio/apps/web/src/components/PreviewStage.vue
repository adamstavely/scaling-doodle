<script setup lang="ts">
import { paramsAtTime } from '@energy-studio/core';
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import { makeSampleImage, prepareBase, renderInto } from '@/lib/render';
import { loadImage, source, state } from '@/lib/state';

const props = defineProps<{ backdrop?: HTMLCanvasElement | null }>();
defineExpose({ openPicker });

/** Long edge of the live preview. Downloads are rendered at full resolution separately. */
const PREVIEW_EDGE = 1280;

const stageEl = ref<HTMLDivElement>();
const canvasEl = ref<HTMLCanvasElement>();
const fileEl = ref<HTMLInputElement>();
const fit = ref({ width: 0, height: 0 });
const dragging = ref(false);
const hovering = ref(false);
const dropActive = ref(false);

let ctx: CanvasRenderingContext2D | null = null;
let base: ImageData | null = null;
let out: ImageData | null = null;
let raf = 0;
let playRaf = 0;
let clock = 0; // seconds of animation elapsed, kept across pause/resume
let resizeObserver: ResizeObserver | null = null;

const horizontal = computed(() => ['left', 'right', 'full'].includes(state.effect.area));

function updateFit() {
  const stage = stageEl.value;
  if (!stage || !base) return;
  const scale = Math.min(stage.clientWidth / base.width, stage.clientHeight / base.height);
  fit.value = { width: Math.floor(base.width * scale), height: Math.floor(base.height * scale) };
}

function rebuild() {
  const src = source.value;
  const canvas = canvasEl.value;
  if (!src || !canvas) {
    base = out = null;
    return;
  }
  base = prepareBase(src, toRaw(state.aspect), PREVIEW_EDGE);
  canvas.width = base.width;
  canvas.height = base.height;
  ctx = canvas.getContext('2d');
  out = ctx!.createImageData(base.width, base.height);
  updateFit();
  draw();
}

function draw() {
  if (!base || !out || !ctx || !canvasEl.value) return;
  const effect = toRaw(state.effect);
  const params = state.playing ? paramsAtTime(effect, toRaw(state.motion), clock) : effect;
  renderInto(base, params, out);
  ctx.putImageData(out, 0, 0);
  paintBackdrop();
}

function paintBackdrop() {
  const bd = props.backdrop;
  const canvas = canvasEl.value;
  if (!bd || !canvas) return;
  const w = 240;
  const h = Math.max(1, Math.round((w * canvas.height) / canvas.width));
  if (bd.width !== w || bd.height !== h) {
    bd.width = w;
    bd.height = h;
  }
  bd.getContext('2d')?.drawImage(canvas, 0, 0, w, h);
}

function requestDraw() {
  if (state.playing || raf) return; // the play loop redraws every frame anyway
  raf = requestAnimationFrame(() => {
    raf = 0;
    draw();
  });
}

function startLoop() {
  let last = performance.now();
  const tick = (now: number) => {
    clock += (now - last) / 1000;
    last = now;
    draw();
    playRaf = requestAnimationFrame(tick);
  };
  playRaf = requestAnimationFrame(tick);
}

watch([source, () => ({ ...state.aspect })], rebuild);
watch(() => ({ ...state.effect }), requestDraw);
watch(
  () => state.playing,
  (playing) => {
    cancelAnimationFrame(playRaf);
    if (playing) startLoop();
    else draw();
  },
);
watch(() => props.backdrop, paintBackdrop);

onMounted(() => {
  resizeObserver = new ResizeObserver(updateFit);
  if (stageEl.value) resizeObserver.observe(stageEl.value);
  rebuild();
  if (state.playing) startLoop();
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  cancelAnimationFrame(raf);
  cancelAnimationFrame(playRaf);
});

// Drag directly on the image to place the axis.
function axisFromPointer(e: PointerEvent) {
  const rect = canvasEl.value!.getBoundingClientRect();
  const f = horizontal.value ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height;
  state.effect.axis = Math.round(Math.min(1, Math.max(0, f)) * 1000) / 1000;
}
function onPointerDown(e: PointerEvent) {
  if (!base) return;
  dragging.value = true;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  axisFromPointer(e);
}
function onPointerMove(e: PointerEvent) {
  if (dragging.value) axisFromPointer(e);
}
function onPointerUp() {
  dragging.value = false;
}
function onKey(e: KeyboardEvent) {
  const step = e.shiftKey ? 0.05 : 0.01;
  const dec = horizontal.value ? 'ArrowLeft' : 'ArrowUp';
  const inc = horizontal.value ? 'ArrowRight' : 'ArrowDown';
  if (e.key === dec || e.key === inc) {
    e.preventDefault();
    state.effect.axis = Math.min(1, Math.max(0, state.effect.axis + (e.key === inc ? step : -step)));
  }
}

const guideStyle = computed(() =>
  horizontal.value
    ? { left: `${state.effect.axis * 100}%`, top: 0, bottom: 0, width: '0' }
    : { top: `${state.effect.axis * 100}%`, left: 0, right: 0, height: '0' },
);

function openPicker() {
  fileEl.value?.click();
}
function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) loadImage(file, file.name);
  (e.target as HTMLInputElement).value = '';
}
function onDrop(e: DragEvent) {
  dropActive.value = false;
  const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('image/'));
  if (file) loadImage(file, file.name);
}
async function useSample() {
  loadImage(await makeSampleImage(), 'sample.png');
}
</script>

<template>
  <div
    ref="stageEl"
    class="stage"
    :class="{ 'drop-active': dropActive }"
    @dragover.prevent="dropActive = true"
    @dragleave.self="dropActive = false"
    @drop.prevent="onDrop"
  >
    <input ref="fileEl" type="file" accept="image/*" hidden @change="onFile" />

    <div
      v-show="source"
      class="frame"
      :class="{ horizontal, dragging }"
      :style="{ width: `${fit.width}px`, height: `${fit.height}px` }"
      role="slider"
      tabindex="0"
      aria-label="Axis position — drag on the image or use arrow keys"
      :aria-valuenow="Math.round(state.effect.axis * 100)"
      aria-valuemin="0"
      aria-valuemax="100"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerenter="hovering = true"
      @pointerleave="hovering = false"
      @keydown="onKey"
    >
      <canvas ref="canvasEl" />
      <div class="guide" :class="{ visible: hovering || dragging }" :style="guideStyle" />
    </div>

    <div v-if="!source" class="empty">
      <svg viewBox="0 0 48 48" width="54" height="54" fill="none" stroke="currentColor" aria-hidden="true">
        <rect x="5" y="5" width="38" height="38" stroke-width="1.4" />
        <line x1="25" y1="5" x2="25" y2="43" stroke-width="1.4" />
        <line v-for="i in 10" :key="i" x1="5" x2="25" :y1="8 + i * 3" :y2="8 + i * 3" stroke-width="0.9" />
      </svg>
      <p class="empty-title">Drop a still image to add energy</p>
      <p class="empty-sub">JPG, PNG, WebP, HEIC up to 40&nbsp;MB</p>
      <div class="empty-actions">
        <button type="button" class="primary" @click="openPicker">Choose image</button>
        <button type="button" class="ghost" @click="useSample">Try a sample</button>
      </div>
    </div>

    <p v-if="state.error" class="error" role="alert">{{ state.error }}</p>
    <div v-if="state.busy" class="busy" aria-live="polite">{{ state.busy }}</div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 280px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  transition: background 0.2s, outline-color 0.2s;
  outline: 2px dashed transparent;
  outline-offset: -2px;
}
.stage.drop-active {
  background: rgba(29, 18, 230, 0.06);
  outline-color: var(--brand);
}
.frame {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 30px 60px -30px rgba(10, 6, 60, 0.6);
  touch-action: none;
  cursor: ew-resize;
  outline: none;
}
.frame:not(.horizontal) {
  cursor: ns-resize;
}
.frame:focus-visible {
  box-shadow: 0 0 0 3px var(--brand), 0 30px 60px -30px rgba(10, 6, 60, 0.6);
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.guide {
  position: absolute;
  border: 0 dashed rgba(255, 255, 255, 0.85);
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
  mix-blend-mode: difference;
}
.horizontal .guide {
  border-left-width: 1px;
}
.frame:not(.horizontal) .guide {
  border-top-width: 1px;
}
.guide.visible,
.frame:focus-visible .guide {
  opacity: 1;
}
.empty {
  display: grid;
  justify-items: center;
  gap: 6px;
  text-align: center;
  color: var(--brand);
  padding: 32px;
}
.empty-title {
  margin: 10px 0 0;
  font-size: 18px;
  color: var(--ink);
}
.empty-sub {
  margin: 0;
  font-size: 13px;
  color: var(--ink-soft);
}
.empty-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.primary,
.ghost {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border-radius: 999px;
  padding: 10px 20px;
  cursor: pointer;
}
.primary {
  background: var(--brand);
  color: #fff;
  border: none;
}
.ghost {
  background: transparent;
  color: var(--brand);
  border: 1.5px solid var(--brand);
}
.error {
  position: absolute;
  bottom: 8px;
  margin: 0;
  font-size: 13px;
  color: #b3261e;
  background: #fff;
  padding: 6px 12px;
  border-radius: 8px;
}
.busy {
  position: absolute;
  inset: auto auto 16px 50%;
  transform: translateX(-50%);
  background: rgba(10, 8, 40, 0.82);
  color: #fff;
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 999px;
  backdrop-filter: blur(6px);
}
</style>
