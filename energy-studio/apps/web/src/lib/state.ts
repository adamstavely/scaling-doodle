import { reactive, shallowRef } from 'vue';
import {
  DEFAULT_ASPECT,
  DEFAULT_EFFECT,
  DEFAULT_MOTION,
  normalizeEffect,
  type AspectSetting,
  type EffectParams,
  type MotionParams,
} from '@energy-studio/core';
import { imageFromUrl, imageFileUrl, uploadImage } from './api';

export type Tab = 'image' | 'colour' | 'motion' | 'presets';
export type SyncStatus = 'none' | 'uploading' | 'synced' | 'offline';
export type MaskTool = 'off' | 'paint' | 'erase';

export interface SourceImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  name: string;
}

/** Decoded source image. Kept out of deep reactivity: ImageBitmap must not be proxied. */
export const source = shallowRef<SourceImage | null>(null);

/**
 * The protect mask, drawn over the whole source in display orientation (white keeps the photo in front of the
 * streaks). Long edge at most MASK_EDGE. Null when there is no mask.
 */
export const mask = shallowRef<HTMLCanvasElement | null>(null);
export const MASK_EDGE = 1024;

export const state = reactive({
  tab: 'image' as Tab,
  aspect: { ...DEFAULT_ASPECT } as AspectSetting,
  effect: normalizeEffect(DEFAULT_EFFECT),
  motion: { ...DEFAULT_MOTION } as MotionParams,
  playing: false,
  /** Number of motion cycles in an exported video or animation. */
  videoCycles: 2,
  videoLongEdge: 1280,
  imageId: null as string | null,
  sync: 'none' as SyncStatus,
  busy: null as null | string,
  /** How far a long export has got, 0..1; null when nothing is running. */
  progress: null as null | number,
  /** The running export can be stopped (video recording). */
  cancellable: false,
  error: null as null | string,
  showGuidance: false,
  showExport: false,
  /** Bumped whenever the mask's pixels change, so the preview and history notice. */
  maskVersion: 0,
  maskTool: 'off' as MaskTool,
  /** Brush diameter as a fraction of the image's long edge. */
  brushSize: 0.06,
  showMask: false,
  detecting: false,
  /** Before/after: the original shows left of `split` (0..1). */
  compare: false,
  split: 0.5,
  /** Preview magnification; 1 fits the image to the stage. */
  zoom: 1,
});

let loadToken = 0;

async function decode(file: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return null;
  }
}

function show(bitmap: ImageBitmap, name: string) {
  source.value?.bitmap.close();
  source.value = { bitmap, width: bitmap.width, height: bitmap.height, name };
  clearMask();
  state.aspect.focusX = 0.5;
  state.aspect.focusY = 0.5;
  state.zoom = 1;
  state.compare = false;
}

/** Decode an image for the preview and upload it for full-resolution renders. */
export async function loadImage(file: Blob, name = 'image') {
  const token = ++loadToken;
  state.error = null;
  const bitmap = await decode(file);
  if (!bitmap) {
    state.error = 'That file could not be read as an image.';
    return;
  }
  if (token !== loadToken) return bitmap.close();
  show(bitmap, name);
  state.imageId = null;
  state.sync = 'uploading';
  try {
    const uploaded = await uploadImage(file, name);
    if (token !== loadToken) return;
    state.imageId = uploaded.id;
    state.sync = 'synced';
  } catch {
    // The editor keeps working locally; downloads fall back to in-browser rendering.
    if (token === loadToken) state.sync = 'offline';
  }
}

/** Loads an image from a web address. The server downloads it, which avoids the browser's cross-site limits. */
export async function loadImageFromUrl(url: string) {
  const token = ++loadToken;
  state.error = null;
  state.busy = 'Fetching image…';
  try {
    const uploaded = await imageFromUrl(url);
    const res = await fetch(imageFileUrl(uploaded.id));
    const bitmap = res.ok ? await decode(await res.blob()) : null;
    if (!bitmap) throw new Error('That address did not give a readable image.');
    if (token !== loadToken) return bitmap.close();
    show(bitmap, new URL(url).pathname.split('/').pop() || 'image');
    state.imageId = uploaded.id;
    state.sync = 'synced';
  } catch (e) {
    if (token === loadToken) state.error = e instanceof Error ? e.message : String(e);
  } finally {
    if (token === loadToken) state.busy = null;
  }
}

/** A blank (all black: nothing protected) mask canvas for the current source. */
export function ensureMask(): HTMLCanvasElement | null {
  const src = source.value;
  if (!src) return null;
  if (mask.value) return mask.value;
  const scale = Math.min(1, MASK_EDGE / Math.max(src.width, src.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(src.width * scale));
  canvas.height = Math.max(1, Math.round(src.height * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  mask.value = canvas;
  return canvas;
}

export function clearMask() {
  mask.value = null;
  state.maskTool = 'off';
  state.maskVersion++;
}

/** Replaces the mask with an image (a subject matte, or a history snapshot), stretched over the source. */
export function setMaskFrom(image: CanvasImageSource) {
  const canvas = ensureMask();
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  state.maskVersion++;
}

/** The mask's pixels as one byte each (its red channel), or null. */
export function maskBytes(): Uint8Array | null {
  const canvas = mask.value;
  if (!canvas) return null;
  const data = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height).data;
  const out = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4];
  return out;
}

export function maskFromBytes(bytes: Uint8Array, width: number, height: number) {
  const src = source.value;
  if (!src) return;
  const canvas = ensureMask()!;
  if (canvas.width !== width || canvas.height !== height) return;
  const img = new ImageData(width, height);
  for (let i = 0; i < bytes.length; i++) {
    const v = bytes[i];
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  canvas.getContext('2d', { willReadFrequently: true })!.putImageData(img, 0, 0);
  state.maskVersion++;
}

/** The mask as a PNG data URL for the API, or undefined. */
export function maskDataUrl(): string | undefined {
  return mask.value?.toDataURL('image/png');
}

/** Centre of the protected subject, as fractions of the source; null without a mask. */
export function subjectCentre(): { x: number; y: number } | null {
  const canvas = mask.value;
  const bytes = maskBytes();
  if (!canvas || !bytes) return null;
  let sum = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++) {
      const v = bytes[y * canvas.width + x];
      if (v > 127) {
        sum += 1;
        sx += x;
        sy += y;
      }
    }
  if (!sum) return null;
  return { x: sx / sum / canvas.width, y: sy / sum / canvas.height };
}

export function resetLook() {
  Object.assign(state.effect, normalizeEffect(DEFAULT_EFFECT));
  Object.assign(state.motion, { ...DEFAULT_MOTION, keyframes: undefined });
}

/** Applies a look (any subset of the effect and motion settings) on top of the defaults. */
export function applyLook(look: { effect?: Partial<EffectParams>; motion?: Partial<MotionParams> }) {
  Object.assign(state.effect, normalizeEffect({ ...DEFAULT_EFFECT, ...look.effect }));
  if (look.motion) Object.assign(state.motion, { ...DEFAULT_MOTION, ...look.motion });
}
