import { resolveAspectRatio, type AspectPreset, type AspectSetting } from '@energy-studio/core';
import { zipSync } from 'fflate';
import { toRaw } from 'vue';
import { renderAnimation, renderImage } from './api';
import { downloadBlob, recordVideo, renderImageLocally } from './render';
import { mask, maskDataUrl, source, state, subjectCentre } from './state';

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'layer' | 'gif' | 'webp-animated' | 'video';

export const EXPORT_FORMATS: { value: ExportFormat; label: string; still: boolean; needsServer: boolean }[] = [
  { value: 'png', label: 'PNG', still: true, needsServer: false },
  { value: 'jpeg', label: 'JPEG', still: true, needsServer: false },
  { value: 'webp', label: 'WebP', still: true, needsServer: false },
  { value: 'layer', label: 'Streaks only (PNG)', still: true, needsServer: false },
  { value: 'gif', label: 'GIF', still: false, needsServer: true },
  { value: 'webp-animated', label: 'Animated WebP', still: false, needsServer: true },
  { value: 'video', label: 'Video', still: false, needsServer: false },
];

/** The social sizes in an export pack, each cropped around the subject. */
export const PACK_SIZES: { preset: AspectPreset; name: string }[] = [
  { preset: '1:1', name: 'square-1x1' },
  { preset: '4:5', name: 'portrait-4x5' },
  { preset: '9:16', name: 'story-9x16' },
  { preset: '16:9', name: 'landscape-16x9' },
];

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

function look() {
  return { effect: structuredClone(toRaw(state.effect)), motion: structuredClone(toRaw(state.motion)) };
}

/** One still, rendered on the server when it can be (full resolution), otherwise in the browser. */
async function still(format: 'png' | 'jpeg' | 'webp' | 'layer', aspect: AspectSetting): Promise<Blob> {
  const layer = format === 'layer';
  const type = layer ? 'png' : format;
  const { effect } = look();
  if (state.imageId) {
    try {
      return await renderImage({ imageId: state.imageId, effect, aspect, mask: maskDataUrl(), format: type, layer });
    } catch (e) {
      console.warn('Server render failed, rendering in browser', e);
    }
  }
  return renderImageLocally({ src: source.value!, aspect, effect, mask: mask.value, layer, type: `image/${type}` });
}

const extension = (format: ExportFormat) =>
  ({ png: 'png', jpeg: 'jpg', webp: 'webp', layer: 'png', gif: 'gif', 'webp-animated': 'webp', video: '' })[format];

export async function exportStill(format: 'png' | 'jpeg' | 'webp' | 'layer') {
  state.busy = 'Rendering…';
  const blob = await still(format, structuredClone(toRaw(state.aspect)));
  downloadBlob(blob, `energy-studio${format === 'layer' ? '-streaks' : ''}-${stamp()}.${extension(format)}`);
}

/** Every social size in one zip, each crop centred on the protected subject (or the current focus). */
export async function exportPack(format: 'png' | 'jpeg' | 'webp' | 'layer') {
  const centre = subjectCentre();
  const files: Record<string, Uint8Array> = {};
  for (const [i, size] of PACK_SIZES.entries()) {
    state.busy = `Rendering ${size.name} (${i + 1} of ${PACK_SIZES.length})`;
    state.progress = i / PACK_SIZES.length;
    const aspect: AspectSetting = {
      ...structuredClone(toRaw(state.aspect)),
      preset: size.preset,
      focusX: centre?.x ?? state.aspect.focusX ?? 0.5,
      focusY: centre?.y ?? state.aspect.focusY ?? 0.5,
    };
    const blob = await still(format, aspect);
    files[`energy-studio-${size.name}.${extension(format)}`] = new Uint8Array(await blob.arrayBuffer());
  }
  state.progress = 1;
  // Images are already compressed: store them rather than deflating again.
  const zip = zipSync(files, { level: 0 });
  downloadBlob(new Blob([zip], { type: 'application/zip' }), `energy-studio-pack-${stamp()}.zip`);
}

/** The server's limit on width × height × frames for one animation (see render.service.ts). */
const ANIMATION_PIXEL_BUDGET = 60_000_000;
/** GIF and animated WebP never exceed this long edge. */
const ANIMATION_MAX_EDGE = 1280;

export const animationSeconds = () => Math.min(30, state.motion.duration * state.videoCycles);

/** The long edge an animation will actually get: the chosen size, shrunk to fit the server's pixel budget. */
export function animationEdge(fps: number): number {
  const src = source.value;
  const wanted = Math.min(ANIMATION_MAX_EDGE, state.videoLongEdge);
  if (!src) return wanted;
  const ratio = resolveAspectRatio(state.aspect, src);
  const shortOverLong = Math.min(ratio, 1 / ratio);
  const frames = Math.max(1, Math.round(animationSeconds() * fps));
  const fits = Math.floor(Math.sqrt(ANIMATION_PIXEL_BUDGET / (frames * shortOverLong)) * 0.98);
  return Math.max(64, Math.min(wanted, fits));
}

/** Animated GIF or WebP, rendered frame by frame on the server. */
export async function exportAnimation(format: 'gif' | 'webp-animated', fps: number) {
  if (!state.imageId) throw new Error('Animated GIF and WebP are made on the server, which is not reachable right now.');
  state.busy = `Rendering ${format === 'gif' ? 'GIF' : 'animated WebP'}…`;
  state.progress = null;
  const { effect, motion } = look();
  const blob = await renderAnimation({
    imageId: state.imageId,
    effect,
    motion,
    aspect: structuredClone(toRaw(state.aspect)),
    mask: maskDataUrl(),
    format: format === 'gif' ? 'gif' : 'webp',
    fps,
    seconds: animationSeconds(),
    maxLongEdge: animationEdge(fps),
  });
  downloadBlob(blob, `energy-studio-${stamp()}.${extension(format)}`);
}

let recording: AbortController | null = null;

/** Records the motion as a video in the browser. Can be cancelled with cancelExport(). */
export async function exportVideo() {
  const wasPlaying = state.playing;
  state.playing = false; // free the CPU for the recorder
  state.busy = 'Recording 0%';
  state.progress = 0;
  recording = new AbortController();
  state.cancellable = true;
  try {
    const { effect, motion } = look();
    const { blob, ext } = await recordVideo({
      src: source.value!,
      aspect: structuredClone(toRaw(state.aspect)),
      effect,
      motion,
      mask: mask.value,
      seconds: state.motion.duration * state.videoCycles,
      longEdge: state.videoLongEdge,
      signal: recording.signal,
      onProgress: (f) => {
        state.busy = `Recording ${Math.round(f * 100)}%`;
        state.progress = f;
      },
    });
    downloadBlob(blob, `energy-studio-${stamp()}.${ext}`);
  } finally {
    recording = null;
    state.cancellable = false;
    state.playing = wasPlaying;
  }
}

export function cancelExport() {
  recording?.abort();
}

/** Runs an export with the shared busy state and error reporting. Cancelling is not an error. */
export async function runExport(job: () => Promise<void>) {
  if (!source.value || state.busy) return;
  state.error = null;
  try {
    await job();
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) state.error = e instanceof Error ? e.message : String(e);
  } finally {
    state.busy = null;
    state.progress = null;
  }
}
