<script setup lang="ts">
import { paramsAtTime } from '@energy-studio/core';
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import { ImagePlus, ImageUp, Sparkles, TriangleAlert } from 'lucide-vue-next';
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

// Runtime geometry goes to CSS as custom properties; the stylesheet decides how to use them.
const frameVars = computed(() => ({ '--frame-w': `${fit.value.width}px`, '--frame-h': `${fit.value.height}px` }));
const guideVars = computed(() => ({ '--axis': `${state.effect.axis * 100}%` }));

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
      :style="frameVars"
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
      <div class="guide" :class="{ visible: hovering || dragging }" :style="guideVars" />
    </div>

    <div v-if="!source" class="empty">
      <ImageUp class="empty-icon" aria-hidden="true" />
      <p class="empty-title">Drop a still image to add energy</p>
      <p class="es-note">JPG, PNG, WebP, HEIC up to 40&nbsp;MB</p>
      <div class="empty-actions">
        <tc-button variant="primary" label="Choose image" @click="openPicker">
          <ImagePlus slot="icon" />
        </tc-button>
        <tc-button variant="secondary" label="Try a sample" @click="useSample">
          <Sparkles slot="icon" />
        </tc-button>
      </div>
    </div>

    <p v-if="state.error" class="error" role="alert">
      <TriangleAlert class="error-icon" aria-hidden="true" />
      {{ state.error }}
    </p>
    <div v-if="state.busy" class="busy" aria-live="polite">
      <span>{{ state.busy }}</span>
      <tc-progress-bar v-if="state.progress !== null" class="busy-bar" label="Recording video" :value="state.progress" />
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: var(--es-size-preview-min-height);
  display: grid;
  place-items: center;
  border-radius: var(--es-radius-panel);
  outline: var(--es-size-drop-outline) dashed transparent;
  outline-offset: calc(-1 * var(--es-size-drop-outline));
  transition:
    background var(--tc-duration-base) var(--tc-ease-standard),
    outline-color var(--tc-duration-base) var(--tc-ease-standard);
}
.stage.drop-active {
  background: var(--es-color-drop);
  outline-color: var(--es-color-drop-outline);
}
.frame {
  position: relative;
  width: var(--frame-w);
  height: var(--frame-h);
  border-radius: var(--es-radius-frame);
  overflow: hidden;
  box-shadow: var(--es-shadow-frame);
  touch-action: none;
  cursor: ew-resize;
  outline: none;
}
.frame:not(.horizontal) {
  cursor: ns-resize;
}
.frame:focus-visible {
  outline: var(--tc-focus-outline);
  outline-offset: var(--tc-focus-ring-offset);
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.guide {
  position: absolute;
  border: 0 dashed var(--es-color-axis-guide);
  opacity: 0;
  transition: opacity var(--tc-duration-fast) var(--tc-ease-standard);
  pointer-events: none;
  mix-blend-mode: difference;
}
.horizontal .guide {
  inset: 0 auto 0 var(--axis);
  border-left-width: var(--es-size-axis-guide);
}
.frame:not(.horizontal) .guide {
  inset: var(--axis) 0 auto 0;
  border-top-width: var(--es-size-axis-guide);
}
.guide.visible,
.frame:focus-visible .guide {
  opacity: 1;
}
.empty {
  display: grid;
  justify-items: center;
  gap: var(--tc-space-1-5);
  text-align: center;
  padding: var(--tc-space-8);
}
.empty-icon {
  width: var(--es-size-empty-icon);
  height: var(--es-size-empty-icon);
  color: var(--es-color-illustration);
  stroke-width: 1.25;
}
.empty-title {
  margin-top: var(--tc-space-2-5);
  font-size: var(--es-font-empty-title-size);
  font-weight: var(--tc-font-weight-medium);
  color: var(--tc-text-primary);
}
.empty-actions {
  display: flex;
  gap: var(--tc-space-2-5);
  margin-top: var(--tc-space-4);
}
.error {
  position: absolute;
  bottom: var(--tc-space-2);
  display: flex;
  align-items: center;
  gap: var(--tc-space-1-5);
  padding: var(--tc-space-1-5) var(--tc-space-3);
  border-radius: var(--tc-radius-md);
  background: var(--tc-status-danger-bg);
  color: var(--tc-status-danger-fg);
  font-size: var(--tc-font-size-md);
}
.error-icon {
  flex: none;
  width: var(--es-size-status-icon);
  height: var(--es-size-status-icon);
}
.busy {
  position: absolute;
  inset: auto auto var(--tc-space-4) 50%;
  transform: translateX(-50%);
  display: grid;
  gap: var(--tc-space-1-5);
  min-width: var(--es-size-download-min-width);
  padding: var(--tc-space-2) var(--tc-space-4);
  border-radius: var(--es-radius-busy);
  background: var(--es-color-busy);
  color: var(--es-color-busy-text);
  font-size: var(--tc-font-size-md);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
</style>
