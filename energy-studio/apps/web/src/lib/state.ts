import { reactive, shallowRef } from 'vue';
import {
  DEFAULT_ASPECT,
  DEFAULT_EFFECT,
  DEFAULT_MOTION,
  type AspectSetting,
  type EffectParams,
  type MotionParams,
} from '@energy-studio/core';
import { uploadImage } from './api';

export type Tab = 'image' | 'motion';
export type SyncStatus = 'none' | 'uploading' | 'synced' | 'offline';

export interface SourceImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  name: string;
}

/** Decoded source image. Kept out of deep reactivity: ImageBitmap must not be proxied. */
export const source = shallowRef<SourceImage | null>(null);

export const state = reactive({
  tab: 'image' as Tab,
  aspect: { ...DEFAULT_ASPECT } as AspectSetting,
  effect: { ...DEFAULT_EFFECT } as EffectParams,
  motion: { ...DEFAULT_MOTION } as MotionParams,
  playing: false,
  /** Number of motion cycles in an exported video. */
  videoCycles: 2,
  videoLongEdge: 1280,
  imageId: null as string | null,
  sync: 'none' as SyncStatus,
  busy: null as null | string,
  /** How far a video recording has got, 0..1; null when nothing is recording. */
  progress: null as null | number,
  error: null as null | string,
  showGuidance: false,
});

let loadToken = 0;

/** Decode an image for the preview and upload it for full-resolution renders. */
export async function loadImage(file: Blob, name = 'image') {
  const token = ++loadToken;
  state.error = null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    state.error = 'That file could not be read as an image.';
    return;
  }
  source.value?.bitmap.close();
  source.value = { bitmap, width: bitmap.width, height: bitmap.height, name };
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

export function resetEffect() {
  Object.assign(state.effect, DEFAULT_EFFECT);
  Object.assign(state.motion, DEFAULT_MOTION);
}
