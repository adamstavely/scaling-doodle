import {
  applyEnergy,
  coverCrop,
  outputSize,
  paramsAtTime,
  resolveAspectRatio,
  type AspectSetting,
  type EffectParams,
  type MotionParams,
} from '@energy-studio/core';
import type { SourceImage } from './state';

function canvas2d(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D is not available');
  return { canvas, ctx };
}

/** The cropped, scaled source pixels the effect is applied to. */
export function prepareBase(src: SourceImage, aspect: AspectSetting, maxLongEdge: number, even = false): ImageData {
  const size = outputSize(aspect, src, maxLongEdge);
  if (even) {
    // Video encoders want even dimensions.
    size.width = Math.max(2, size.width - (size.width % 2));
    size.height = Math.max(2, size.height - (size.height % 2));
  }
  const crop = coverCrop(src, resolveAspectRatio(aspect, src));
  const { ctx } = canvas2d(size.width, size.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src.bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, size.width, size.height);
  return ctx.getImageData(0, 0, size.width, size.height);
}

/** Applies the effect from `base` into `out` (same dimensions). */
export function renderInto(base: ImageData, params: EffectParams, out: ImageData) {
  applyEnergy(base.data, base.width, base.height, params, out.data);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Full-resolution render in the browser, used when the API is unavailable. */
export async function renderImageLocally(
  src: SourceImage,
  aspect: AspectSetting,
  effect: EffectParams,
  maxLongEdge = 4096,
): Promise<Blob> {
  const base = prepareBase(src, aspect, maxLongEdge);
  const { canvas, ctx } = canvas2d(base.width, base.height);
  const out = ctx.createImageData(base.width, base.height);
  renderInto(base, effect, out);
  ctx.putImageData(out, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode PNG'))), 'image/png'),
  );
}

const VIDEO_TYPES = [
  'video/mp4;codecs=avc1.640028',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export function supportedVideoType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  return VIDEO_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

/**
 * Records the animated effect in real time with MediaRecorder.
 * Returns the video and the file extension that matches its container.
 */
export async function recordVideo(opts: {
  src: SourceImage;
  aspect: AspectSetting;
  effect: EffectParams;
  motion: MotionParams;
  seconds: number;
  longEdge: number;
  fps?: number;
  onProgress?: (fraction: number) => void;
}): Promise<{ blob: Blob; ext: string }> {
  const mimeType = supportedVideoType();
  if (!mimeType) throw new Error('This browser cannot record video. Try Chrome, Edge, Firefox or Safari 14.1+.');
  const fps = opts.fps ?? 30;
  const base = prepareBase(opts.src, opts.aspect, opts.longEdge, true);
  const { canvas, ctx } = canvas2d(base.width, base.height);
  const out = ctx.createImageData(base.width, base.height);

  renderInto(base, paramsAtTime(opts.effect, opts.motion, 0), out);
  ctx.putImageData(out, 0, 0);

  const stream = canvas.captureStream(fps);
  const pixels = base.width * base.height;
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: Math.round(pixels * fps * 0.25) });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
  recorder.start(250);

  await new Promise<void>((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (t >= opts.seconds) {
        resolve();
        return;
      }
      renderInto(base, paramsAtTime(opts.effect, opts.motion, t), out);
      ctx.putImageData(out, 0, 0);
      opts.onProgress?.(t / opts.seconds);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  recorder.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  const type = mimeType.split(';')[0];
  return { blob: new Blob(chunks, { type }), ext: type === 'video/mp4' ? 'mp4' : 'webm' };
}

/** A generated demo picture so the studio can be tried without an upload. */
export async function makeSampleImage(): Promise<Blob> {
  const w = 1800;
  const h = 1200;
  const { canvas, ctx } = canvas2d(w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1b10f0');
  sky.addColorStop(0.55, '#2c22ff');
  sky.addColorStop(1, '#090540');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Horizon of coloured bands to give the streaks varied colour.
  const bands = ['#0d0838', '#f4f1ff', '#3d2cff', '#120a4a', '#c24dff', '#6b5cff', '#05031c', '#9ad0ff', '#1f15b8'];
  let y = h * 0.42;
  bands.forEach((color, i) => {
    const bh = 18 + ((i * 37) % 60);
    ctx.fillStyle = color;
    ctx.fillRect(0, y, w, bh);
    y += bh + 6;
  });

  // Glowing orb.
  const orb = ctx.createRadialGradient(w * 0.72, h * 0.38, 10, w * 0.72, h * 0.38, 330);
  orb.addColorStop(0, 'rgba(255,255,255,0.95)');
  orb.addColorStop(0.25, 'rgba(170,150,255,0.8)');
  orb.addColorStop(1, 'rgba(40,20,255,0)');
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.38, 330, 0, Math.PI * 2);
  ctx.fill();

  // Dark monolith silhouette on the right.
  ctx.fillStyle = '#05031a';
  ctx.beginPath();
  ctx.moveTo(w * 0.8, h);
  ctx.lineTo(w * 0.83, h * 0.3);
  ctx.lineTo(w * 0.9, h * 0.22);
  ctx.lineTo(w * 0.95, h * 0.34);
  ctx.lineTo(w * 0.97, h);
  ctx.closePath();
  ctx.fill();

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create sample'))), 'image/png'),
  );
}
