<script setup lang="ts">
import { cropFor, paramsAtTime } from '@energy-studio/core';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import { Columns2, ImagePlus, ImageUp, Link, Scan, Sparkles, TriangleAlert, X, ZoomIn, ZoomOut } from 'lucide-vue-next';
import { cancelExport } from '@/lib/export';
import { makeSampleImage, maskForBase, prepareBase, renderInto } from '@/lib/render';
import { ensureMask, loadImage, loadImageFromUrl, mask, source, state } from '@/lib/state';
import TextField from './TextField.vue';

const props = defineProps<{ backdrop?: HTMLCanvasElement | null }>();
defineExpose({ openPicker });

/** Long edge of the live preview. Downloads are rendered at full resolution separately. */
const PREVIEW_EDGE = 1280;
const ZOOMS = [1, 1.5, 2, 3, 4, 6, 8];

const stageEl = ref<HTMLDivElement>();
const canvasEl = ref<HTMLCanvasElement>();
const beforeEl = ref<HTMLCanvasElement>();
const overlayEl = ref<HTMLCanvasElement>();
const swatchEl = ref<HTMLSpanElement>();
const fileEl = ref<HTMLInputElement>();
const fit = ref({ width: 0, height: 0 });
const dragging = ref(false);
const hovering = ref(false);
const dropActive = ref(false);
const pointer = ref({ x: 0, y: 0 });
const url = ref('');

let ctx: CanvasRenderingContext2D | null = null;
let base: ImageData | null = null;
let out: ImageData | null = null;
let previewMask: Uint8Array | null = null;
let raf = 0;
let playRaf = 0;
let clock = 0; // seconds of animation elapsed, kept across pause/resume
let resizeObserver: ResizeObserver | null = null;

const horizontal = computed(() => ['left', 'right', 'full'].includes(state.effect.area));
const burst = computed(() => state.effect.mode === 'burst');
const painting = computed(() => state.maskTool !== 'off');
const showOverlay = computed(() => (state.showMask || painting.value) && !!mask.value);

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
    base = out = previewMask = null;
    return;
  }
  base = prepareBase(src, toRaw(state.aspect), PREVIEW_EDGE);
  for (const c of [canvas, beforeEl.value, overlayEl.value]) {
    if (!c) continue;
    c.width = base.width;
    c.height = base.height;
  }
  beforeEl.value?.getContext('2d')?.putImageData(base, 0, 0);
  ctx = canvas.getContext('2d');
  out = ctx!.createImageData(base.width, base.height);
  rebuildMask();
  updateFit();
}

/** The mask at preview size, and its tinted overlay. */
function rebuildMask() {
  const src = source.value;
  previewMask = src && base ? maskForBase(mask.value, src, toRaw(state.aspect), base.width, base.height) : null;
  paintOverlay();
  requestDraw(true);
}

/** Tints protected pixels with the mask colour token (read from a hidden swatch, so it follows the theme). */
function paintOverlay() {
  const canvas = overlayEl.value;
  if (!canvas || !base) return;
  const octx = canvas.getContext('2d')!;
  if (!previewMask || !showOverlay.value) return octx.clearRect(0, 0, canvas.width, canvas.height);
  const rgb = (swatchEl.value ? getComputedStyle(swatchEl.value).color : '').match(/[\d.]+/g)?.map(Number) ?? [0, 96, 226];
  const img = octx.createImageData(base.width, base.height);
  for (let i = 0; i < previewMask.length; i++) {
    const v = previewMask[i];
    if (!v) continue;
    img.data[i * 4] = rgb[0];
    img.data[i * 4 + 1] = rgb[1];
    img.data[i * 4 + 2] = rgb[2];
    img.data[i * 4 + 3] = v;
  }
  octx.putImageData(img, 0, 0);
}

function draw() {
  if (!base || !out || !ctx || !canvasEl.value) return;
  const effect = toRaw(state.effect);
  const params = state.playing ? paramsAtTime(effect, toRaw(state.motion), clock) : effect;
  renderInto(base, params, out, { mask: previewMask });
  ctx.putImageData(out, 0, 0);
  paintBackdrop();
}

function paintBackdrop() {
  const bd = props.backdrop;
  const canvas = canvasEl.value;
  if (!bd || !canvas || !canvas.width) return;
  const w = 240;
  const h = Math.max(1, Math.round((w * canvas.height) / canvas.width));
  if (bd.width !== w || bd.height !== h) {
    bd.width = w;
    bd.height = h;
  }
  bd.getContext('2d')?.drawImage(canvas, 0, 0, w, h);
}

function requestDraw(force = false) {
  if ((state.playing && !force) || raf) return; // the play loop redraws every frame anyway
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

watch([source, () => ({ ...state.aspect })], () => {
  rebuild();
  draw();
});
watch(() => state.effect, () => requestDraw(), { deep: true });
watch(() => state.motion, () => requestDraw(), { deep: true });
watch(() => state.maskVersion, rebuildMask);
watch(showOverlay, paintOverlay);
watch(
  () => state.playing,
  (playing) => {
    cancelAnimationFrame(playRaf);
    if (playing) startLoop();
    else draw();
  },
);
watch(() => props.backdrop, paintBackdrop);
watch(
  () => state.zoom,
  async () => {
    await nextTick();
    const stage = stageEl.value;
    if (stage) {
      stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2;
      stage.scrollTop = (stage.scrollHeight - stage.clientHeight) / 2;
    }
  },
);

onMounted(() => {
  resizeObserver = new ResizeObserver(updateFit);
  if (stageEl.value) resizeObserver.observe(stageEl.value);
  rebuild();
  draw();
  if (state.playing) startLoop();
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  cancelAnimationFrame(raf);
  cancelAnimationFrame(playRaf);
});

// ---- Pointer: one gesture on the image does one thing, chosen by what's active ----

/** Pointer position as fractions of the image (0..1). */
function fractions(e: PointerEvent) {
  const rect = canvasEl.value!.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
  };
}
const round = (v: number) => Math.round(v * 1000) / 1000;

let lastStroke: { x: number; y: number } | null = null;
let maskRaf = 0;

/** Paints (or erases) the protect mask along the pointer's path, in source coordinates. */
function paint(f: { x: number; y: number }) {
  const src = source.value;
  const canvas = ensureMask();
  if (!src || !canvas) return;
  const crop = cropFor(toRaw(state.aspect), src);
  const kx = canvas.width / src.width;
  const ky = canvas.height / src.height;
  const p = { x: (crop.sx + f.x * crop.sw) * kx, y: (crop.sy + f.y * crop.sh) * ky };
  const mctx = canvas.getContext('2d', { willReadFrequently: true })!;
  mctx.strokeStyle = mctx.fillStyle = state.maskTool === 'paint' ? '#fff' : '#000';
  mctx.lineCap = mctx.lineJoin = 'round';
  mctx.lineWidth = state.brushSize * Math.max(crop.sw * kx, crop.sh * ky);
  mctx.beginPath();
  mctx.moveTo((lastStroke ?? p).x, (lastStroke ?? p).y);
  mctx.lineTo(p.x, p.y);
  mctx.stroke();
  lastStroke = p;
  // One mask refresh per frame however fast the pointer moves.
  maskRaf ||= requestAnimationFrame(() => {
    maskRaf = 0;
    state.maskVersion++;
  });
}

function act(e: PointerEvent) {
  const f = fractions(e);
  if (state.compare) state.split = round(f.x);
  else if (painting.value) paint(f);
  else if (burst.value) {
    state.effect.centerX = round(f.x);
    state.effect.centerY = round(f.y);
  } else state.effect.axis = round(horizontal.value ? f.x : f.y);
}

function onPointerDown(e: PointerEvent) {
  if (!base || e.button !== 0) return;
  dragging.value = true;
  lastStroke = null;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  act(e);
}
function onPointerMove(e: PointerEvent) {
  const rect = canvasEl.value!.getBoundingClientRect();
  pointer.value = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  if (dragging.value) act(e);
}
function onPointerUp() {
  dragging.value = false;
  lastStroke = null;
}
function onKey(e: KeyboardEvent) {
  const step = e.shiftKey ? 0.05 : 0.01;
  const dec = horizontal.value ? 'ArrowLeft' : 'ArrowUp';
  const inc = horizontal.value ? 'ArrowRight' : 'ArrowDown';
  if (e.key === dec || e.key === inc) {
    e.preventDefault();
    state.effect.axis = round(Math.min(1, Math.max(0, state.effect.axis + (e.key === inc ? step : -step))));
  }
}

// ---- Zoom ----
function zoomBy(direction: 1 | -1) {
  const i = ZOOMS.findIndex((z) => z >= state.zoom - 1e-6);
  state.zoom = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, (i < 0 ? 0 : i) + direction))];
}
function onWheel(e: WheelEvent) {
  if (!(e.ctrlKey || e.metaKey) || !source.value) return;
  e.preventDefault();
  zoomBy(e.deltaY < 0 ? 1 : -1);
}

// Runtime geometry goes to CSS as custom properties; the stylesheet decides how to use them.
const frameVars = computed(() => ({
  '--frame-w': `${Math.round(fit.value.width * state.zoom)}px`,
  '--frame-h': `${Math.round(fit.value.height * state.zoom)}px`,
}));
const guideVars = computed(() => ({ '--axis': `${state.effect.axis * 100}%` }));
const centreVars = computed(() => ({ '--cx': `${state.effect.centerX * 100}%`, '--cy': `${state.effect.centerY * 100}%` }));
const splitVars = computed(() => ({ '--split': `${state.split * 100}%` }));
const brushVars = computed(() => ({
  '--bx': `${pointer.value.x}px`,
  '--by': `${pointer.value.y}px`,
  '--bd': `${state.brushSize * Math.max(fit.value.width, fit.value.height) * state.zoom}px`,
}));

const frameLabel = computed(() =>
  state.compare
    ? 'Before and after — drag to move the divider'
    : painting.value
      ? 'Protect mask — drag to paint'
      : burst.value
        ? 'Burst centre — click to place it'
        : 'Axis position — drag on the image or use arrow keys',
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
  if (file) return loadImage(file, file.name);
  const link = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain');
  if (link && /^https?:\/\//i.test(link.trim())) loadImageFromUrl(link.trim());
}
async function useSample() {
  loadImage(await makeSampleImage(), 'sample.png');
}
function loadUrl() {
  if (url.value.trim()) loadImageFromUrl(url.value.trim());
}
</script>

<template>
  <div class="preview">
    <span ref="swatchEl" class="mask-swatch" aria-hidden="true" />
    <div v-if="source" class="toolbar" role="toolbar" aria-label="Preview">
      <tc-button
        :variant="state.compare ? 'secondary' : 'ghost'"
        size="sm"
        label="Compare"
        :aria-pressed="state.compare"
        title="Before and after (\)"
        @click="state.compare = !state.compare"
      >
        <Columns2 slot="icon" />
      </tc-button>
      <span class="spacer" />
      <tc-button variant="ghost" size="sm" hide-label label="Zoom out" :disabled="state.zoom <= 1" @click="zoomBy(-1)">
        <ZoomOut slot="icon" />
      </tc-button>
      <span class="zoom es-note" aria-live="polite">{{ Math.round(state.zoom * 100) }}%</span>
      <tc-button variant="ghost" size="sm" hide-label label="Zoom in" :disabled="state.zoom >= 8" @click="zoomBy(1)">
        <ZoomIn slot="icon" />
      </tc-button>
      <tc-button variant="ghost" size="sm" hide-label label="Fit to view" :disabled="state.zoom === 1" @click="state.zoom = 1">
        <Scan slot="icon" />
      </tc-button>
    </div>

    <div
      ref="stageEl"
      class="stage"
      :class="{ 'drop-active': dropActive, zoomed: state.zoom > 1 }"
      @dragover.prevent="dropActive = true"
      @dragleave.self="dropActive = false"
      @drop.prevent="onDrop"
      @wheel="onWheel"
    >
      <input ref="fileEl" type="file" accept="image/*" hidden @change="onFile" />

      <div
        v-show="source"
        class="frame"
        :class="{ horizontal, dragging, painting, burst, comparing: state.compare }"
        :style="frameVars"
        role="slider"
        tabindex="0"
        :aria-label="frameLabel"
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
        <canvas v-show="state.compare" ref="beforeEl" class="layer before" :style="splitVars" />
        <canvas v-show="showOverlay" ref="overlayEl" class="layer overlay" />
        <div v-if="!state.compare && !burst && !painting" class="guide" :class="{ visible: hovering || dragging }" :style="guideVars" />
        <div v-if="burst && !state.compare && !painting" class="centre" :style="centreVars" />
        <template v-if="state.compare">
          <div class="divider" :style="splitVars" />
          <span class="tag tag--before">Before</span>
          <span class="tag tag--after">After</span>
        </template>
        <div v-if="painting && hovering" class="brush" :class="state.maskTool" :style="brushVars" />
      </div>

      <div v-if="!source" class="empty">
        <ImageUp class="empty-icon" aria-hidden="true" />
        <p class="empty-title">Drop a still image to add energy</p>
        <p class="es-note">JPG, PNG or WebP up to 40&nbsp;MB, or paste an image or a link</p>
        <div class="empty-actions">
          <tc-button variant="primary" label="Choose image" @click="openPicker">
            <ImagePlus slot="icon" />
          </tc-button>
          <tc-button variant="secondary" label="Try a sample" @click="useSample">
            <Sparkles slot="icon" />
          </tc-button>
        </div>
        <div class="from-url">
          <TextField v-model="url" label="Image address" hide-label type="url" placeholder="https://… image address" @enter="loadUrl" />
          <tc-button variant="secondary" label="Load" :disabled="!url.trim()" @click="loadUrl">
            <Link slot="icon" />
          </tc-button>
        </div>
      </div>

      <p v-if="state.error" class="error" role="alert">
        <TriangleAlert class="error-icon" aria-hidden="true" />
        {{ state.error }}
      </p>
      <div v-if="state.busy" class="busy" aria-live="polite">
        <div class="busy-row">
          <span>{{ state.busy }}</span>
          <tc-button v-if="state.cancellable" variant="secondary" size="sm" label="Cancel" @click="cancelExport">
            <X slot="icon" />
          </tc-button>
        </div>
        <tc-progress-bar v-if="state.progress !== null" label="Export progress" :value="state.progress" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--tc-space-2);
  height: 100%;
  min-height: var(--es-size-preview-min-height);
}
.mask-swatch {
  display: none;
  color: var(--es-color-mask);
}
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--tc-space-1);
}
.spacer {
  flex: 1;
}
.zoom {
  min-width: var(--es-size-zoom-label);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.stage {
  position: relative;
  min-height: 0;
  display: flex;
  overflow: auto;
  border-radius: var(--es-radius-panel);
  outline: var(--es-size-drop-outline) dashed transparent;
  outline-offset: calc(-1 * var(--es-size-drop-outline));
  transition:
    background var(--tc-duration-base) var(--tc-ease-standard),
    outline-color var(--tc-duration-base) var(--tc-ease-standard);
}
.stage.zoomed {
  background: var(--tc-fill-subtle);
}
.stage.drop-active {
  background: var(--es-color-drop);
  outline-color: var(--es-color-drop-outline);
}
.frame {
  position: relative;
  flex: none;
  margin: auto;
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
.frame.burst {
  cursor: crosshair;
}
.frame.comparing {
  cursor: col-resize;
}
.frame.painting {
  cursor: none;
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
.layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.before {
  clip-path: inset(0 calc(100% - var(--split)) 0 0);
}
.overlay {
  opacity: var(--es-effect-mask-opacity);
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
.centre {
  position: absolute;
  left: var(--cx);
  top: var(--cy);
  width: var(--es-size-centre-marker);
  height: var(--es-size-centre-marker);
  transform: translate(-50%, -50%);
  border: var(--es-size-handle-line) solid var(--es-color-axis-guide);
  border-radius: var(--tc-radius-full);
  mix-blend-mode: difference;
  pointer-events: none;
}
.divider {
  position: absolute;
  inset: 0 auto 0 var(--split);
  width: var(--es-size-handle-line);
  transform: translateX(-50%);
  background: var(--es-color-axis-guide);
  box-shadow: var(--tc-shadow-overlay);
  pointer-events: none;
}
.tag {
  position: absolute;
  top: var(--tc-space-2);
  padding: var(--tc-space-0-5) var(--tc-space-2);
  border-radius: var(--tc-radius-full);
  background: var(--es-color-busy);
  color: var(--es-color-busy-text);
  font-size: var(--tc-font-size-sm);
  pointer-events: none;
}
.tag--before {
  left: var(--tc-space-2);
}
.tag--after {
  right: var(--tc-space-2);
}
.brush {
  position: absolute;
  left: var(--bx);
  top: var(--by);
  width: var(--bd);
  height: var(--bd);
  transform: translate(-50%, -50%);
  border: var(--es-size-handle-line) solid var(--es-color-axis-guide);
  border-radius: var(--tc-radius-full);
  mix-blend-mode: difference;
  pointer-events: none;
}
.brush.erase {
  border-style: dashed;
}
.empty {
  margin: auto;
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
.from-url {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--tc-space-2);
  width: min(var(--es-size-url-field), 100%);
  margin-top: var(--tc-space-3);
}
.error {
  position: absolute;
  bottom: var(--tc-space-2);
  left: 50%;
  transform: translateX(-50%);
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
.busy-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--tc-space-3);
}
</style>
