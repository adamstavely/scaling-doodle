import { AffectedArea, AxisLayer, EffectParams, RenderOptions } from './types';

/** Any RGBA byte buffer: ImageData.data in the browser, a Buffer from sharp on the server. */
export type PixelBuffer = Uint8ClampedArray | Uint8Array;

export const DEFAULT_EFFECT: EffectParams = {
  mode: 'straight',
  area: 'left',
  axis: 0.4,
  blending: 0.1,
  angle: 18,
  flare: 0.5,
  sampleOffset: 0,
  wave: 0.4,
  length: 1,
  fade: 0,
  centerX: 0.5,
  centerY: 0.5,
  hue: 0,
  saturation: 1,
  tintAmount: 0,
  tintStart: '#5b8cff',
  tintEnd: '#ff4fd8',
  glow: 0,
  extraAxes: [],
};

/** Most further axes an effect can have. */
export const MAX_EXTRA_AXES = 3;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * A complete, plain copy of the settings: missing fields (older saved settings or API callers) take their
 * defaults, and reactive proxies are read once.
 */
export function normalizeEffect(p: Partial<EffectParams>): EffectParams {
  const d = DEFAULT_EFFECT;
  return {
    mode: p.mode ?? d.mode,
    area: p.area ?? d.area,
    axis: num(p.axis, d.axis),
    blending: num(p.blending, d.blending),
    angle: num(p.angle, d.angle),
    flare: num(p.flare, d.flare),
    sampleOffset: num(p.sampleOffset, d.sampleOffset),
    wave: num(p.wave, d.wave),
    length: num(p.length, d.length),
    fade: num(p.fade, d.fade),
    centerX: num(p.centerX, d.centerX),
    centerY: num(p.centerY, d.centerY),
    hue: num(p.hue, d.hue),
    saturation: num(p.saturation, d.saturation),
    tintAmount: num(p.tintAmount, d.tintAmount),
    tintStart: p.tintStart ?? d.tintStart,
    tintEnd: p.tintEnd ?? d.tintEnd,
    glow: num(p.glow, d.glow),
    extraAxes: (p.extraAxes ?? []).slice(0, MAX_EXTRA_AXES).map((a) => ({ area: a.area, axis: num(a.axis, 0.5) })),
  };
}

export function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [255, 255, 255];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Colour treatment of the streaks: hue and saturation (one matrix), tint gradient, glow. */
class Colour {
  private readonly m: number[] | null;
  private readonly tintAmount: number;
  private readonly t0: [number, number, number];
  private readonly t1: [number, number, number];
  private readonly glow: number;
  readonly out = new Float32Array(3);

  constructor(e: EffectParams) {
    const sat = clamp(e.saturation, 0, 2);
    const hue = clamp(e.hue, -180, 180);
    // CSS filter matrices (hue-rotate then saturate), combined.
    if (hue !== 0 || sat !== 1) {
      const a = (hue * Math.PI) / 180;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const h = [
        0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
        0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.14, 0.072 - cos * 0.072 - sin * 0.283,
        0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
      ];
      const s = [
        0.213 + 0.787 * sat, 0.715 - 0.715 * sat, 0.072 - 0.072 * sat,
        0.213 - 0.213 * sat, 0.715 + 0.285 * sat, 0.072 - 0.072 * sat,
        0.213 - 0.213 * sat, 0.715 - 0.715 * sat, 0.072 + 0.928 * sat,
      ];
      const m: number[] = [];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) m.push(s[r * 3] * h[c] + s[r * 3 + 1] * h[3 + c] + s[r * 3 + 2] * h[6 + c]);
      this.m = m;
    } else {
      this.m = null;
    }
    this.tintAmount = clamp(e.tintAmount, 0, 1);
    this.t0 = parseHex(e.tintStart);
    this.t1 = parseHex(e.tintEnd);
    this.glow = clamp(e.glow, 0, 1);
  }

  /** Writes the treated colour to `out`. `t` is how far along the streak the pixel is (0 at the axis, 1 at its end). */
  apply(r: number, g: number, b: number, t: number) {
    const m = this.m;
    if (m) {
      const r2 = m[0] * r + m[1] * g + m[2] * b;
      const g2 = m[3] * r + m[4] * g + m[5] * b;
      const b2 = m[6] * r + m[7] * g + m[8] * b;
      r = r2;
      g = g2;
      b = b2;
    }
    const k = this.tintAmount;
    if (k > 0) {
      // The tint keeps the streak's light and dark: mid grey becomes the tint itself.
      const lum = ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) * 2;
      const t0 = this.t0;
      const t1 = this.t1;
      r += ((t0[0] + (t1[0] - t0[0]) * t) * lum - r) * k;
      g += ((t0[1] + (t1[1] - t0[1]) * t) * lum - g) * k;
      b += ((t0[2] + (t1[2] - t0[2]) * t) * lum - b) * k;
    }
    if (this.glow > 0) {
      const f = 1 - t;
      const lift = this.glow * f * f * 0.85;
      r += (255 - r) * lift;
      g += (255 - g) * lift;
      b += (255 - b) * lift;
    }
    this.out[0] = r < 0 ? 0 : r > 255 ? 255 : r;
    this.out[1] = g < 0 ? 0 : g > 255 ? 255 : g;
    this.out[2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
}

/** Puts a streak pixel of weight `w` over what the layer already holds there (straight alpha). */
function over(L: Uint8ClampedArray, i: number, c: Float32Array, w: number) {
  const a0 = L[i + 3] / 255;
  const a = w + a0 * (1 - w);
  if (a <= 0) return;
  const k1 = w / a;
  const k0 = 1 - k1;
  L[i] = c[0] * k1 + L[i] * k0;
  L[i + 1] = c[1] * k1 + L[i + 1] * k0;
  L[i + 2] = c[2] * k1 + L[i + 2] * k0;
  L[i + 3] = a * 255;
}

/** How opaque a streak is `d` px from its start: soft blend at the axis, cut at its length, optional fade-out. */
function weightAt(d: number, lengthPx: number, blendWidth: number, fade: number): number {
  if (d > lengthPx) return 0;
  let w = 1;
  if (blendWidth > 0 && d < blendWidth) w = smooth(d / blendWidth);
  if (fade > 0) w *= 1 - fade * smooth(d / lengthPx);
  return w;
}

let scratch: Uint8ClampedArray | null = null;
/** A zeroed RGBA layer, reused between calls so animation frames don't allocate. */
function layerBuffer(bytes: number) {
  if (!scratch || scratch.length < bytes) scratch = new Uint8ClampedArray(bytes);
  else scratch.fill(0, 0, bytes);
  return scratch.subarray(0, bytes);
}

/** One axis of streaks into the layer. */
function axisPass(
  src: PixelBuffer,
  width: number,
  height: number,
  e: EffectParams,
  layer: AxisLayer,
  L: Uint8ClampedArray,
  colour: Colour,
) {
  const mode = e.mode;
  const area: AffectedArea = layer.area;
  const horizontal = area === 'left' || area === 'right' || area === 'full';
  // "along" is the axis the streaks travel on, "across" is perpendicular to it.
  const along = horizontal ? width : height;
  const across = horizontal ? height : width;
  const strideAlong = horizontal ? 4 : width * 4;
  const strideAcross = horizontal ? width * 4 : 4;

  const axisPos = clamp(layer.axis, 0, 1) * (along - 1);
  const samplePos = clamp(axisPos + e.sampleOffset * along, 0, along - 1);

  // The line of pixels the streaks are made from (linear interpolation between columns/rows).
  const line = new Float32Array(across * 3);
  if (mode !== 'mirror') {
    const s0 = Math.floor(samplePos);
    const s1 = Math.min(s0 + 1, along - 1);
    const sf = samplePos - s0;
    for (let c = 0; c < across; c++) {
      const i0 = c * strideAcross + s0 * strideAlong;
      const i1 = c * strideAcross + s1 * strideAlong;
      for (let k = 0; k < 3; k++) line[c * 3 + k] = src[i0 + k] * (1 - sf) + src[i1 + k] * sf;
    }
  }

  const before = axisPos;
  const after = along - 1 - axisPos;
  let regionLength: number;
  let lo: number;
  let hi: number;
  switch (area) {
    case 'left':
    case 'top':
      regionLength = before;
      lo = 0;
      hi = Math.floor(axisPos);
      break;
    case 'right':
    case 'bottom':
      regionLength = after;
      lo = Math.ceil(axisPos);
      hi = along - 1;
      break;
    default:
      regionLength = Math.max(before, after);
      lo = 0;
      hi = along - 1;
  }
  regionLength = Math.max(regionLength, 1);
  const lengthPx = Math.max(1, clamp(e.length, 0.05, 1) * regionLength);
  lo = Math.max(lo, Math.ceil(axisPos - lengthPx));
  hi = Math.min(hi, Math.floor(axisPos + lengthPx));

  const blendWidth = Math.min(clamp(e.blending, 0, 1) * regionLength, lengthPx);
  const fade = clamp(e.fade, 0, 1);
  const tilt = mode === 'angle' ? Math.tan((clamp(e.angle, -75, 75) * Math.PI) / 180) : 0;
  const flare = mode === 'flare' ? clamp(e.flare, 0, 1) * 3 : 0;
  const waveAmp = mode === 'wave' ? clamp(e.wave, 0, 1) * across * 0.06 : 0;
  const waveLen = Math.max(8, regionLength * 0.25);
  const centre = (across - 1) / 2;
  const maxC = across - 1;
  const maxA = along - 1;
  const out = colour.out;

  for (let a = lo; a <= hi; a++) {
    const s = a - axisPos;
    const d = Math.abs(s);
    const w = weightAt(d, lengthPx, blendWidth, fade);
    if (w <= 0) continue;
    const t = d / lengthPx;
    const flareDiv = 1 + flare * (d / regionLength);
    const shift = waveAmp ? waveAmp * Math.sin((2 * Math.PI * d) / waveLen) : 0;

    // Mirror: the reflected position on the other side, pulled towards the axis with distance so it stretches.
    let m0 = 0;
    let m1 = 0;
    let mf = 0;
    if (mode === 'mirror') {
      const ma = clamp(axisPos - s / (1 + (3 * d) / regionLength), 0, maxA);
      m0 = ma | 0;
      m1 = m0 < maxA ? m0 + 1 : m0;
      mf = ma - m0;
    }

    for (let c = 0; c < across; c++) {
      const idx = c * strideAcross + a * strideAlong;
      let r: number;
      let g: number;
      let b: number;
      if (mode === 'mirror') {
        const i0 = c * strideAcross + m0 * strideAlong;
        const i1 = c * strideAcross + m1 * strideAlong;
        r = src[i0] + (src[i1] - src[i0]) * mf;
        g = src[i0 + 1] + (src[i1 + 1] - src[i0 + 1]) * mf;
        b = src[i0 + 2] + (src[i1 + 2] - src[i0 + 2]) * mf;
      } else {
        let cp: number;
        if (mode === 'angle') cp = c + s * tilt;
        else if (mode === 'flare') cp = centre + (c - centre) / flareDiv;
        else cp = c + shift;
        cp = cp < 0 ? 0 : cp > maxC ? maxC : cp;
        const c0 = cp | 0;
        const c1 = c0 < maxC ? c0 + 1 : c0;
        const cf = cp - c0;
        const l0 = c0 * 3;
        const l1 = c1 * 3;
        r = line[l0] + (line[l1] - line[l0]) * cf;
        g = line[l0 + 1] + (line[l1 + 1] - line[l0 + 1]) * cf;
        b = line[l0 + 2] + (line[l1 + 2] - line[l0 + 2]) * cf;
      }
      colour.apply(r, g, b, t);
      over(L, idx, out, w);
    }
  }
}

/** Radial zoom: the ring of pixels at `axis` × half-diagonal around the centre streaks outwards. */
function burstPass(src: PixelBuffer, width: number, height: number, e: EffectParams, L: Uint8ClampedArray, colour: Colour) {
  const cx = clamp(e.centerX, 0, 1) * (width - 1);
  const cy = clamp(e.centerY, 0, 1) * (height - 1);
  const maxR = Math.max(Math.hypot(cx, cy), Math.hypot(width - 1 - cx, cy), Math.hypot(cx, height - 1 - cy), Math.hypot(width - 1 - cx, height - 1 - cy));
  const r0 = clamp(e.axis, 0, 1) * (Math.hypot(width, height) / 2);
  if (r0 >= maxR) return;
  const ringR = clamp(r0 + e.sampleOffset * maxR, 0, maxR);
  const regionLength = Math.max(1, maxR - r0);
  const lengthPx = Math.max(1, clamp(e.length, 0.05, 1) * regionLength);
  const blendWidth = Math.min(clamp(e.blending, 0, 1) * regionLength, lengthPx);
  const fade = clamp(e.fade, 0, 1);
  const out = colour.out;
  const maxX = width - 1;
  const maxY = height - 1;

  for (let y = 0; y < height; y++) {
    const dy = y - cy;
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const r = Math.sqrt(dx * dx + dy * dy);
      const d = r - r0;
      if (d <= 0) continue;
      const w = weightAt(d, lengthPx, blendWidth, fade);
      if (w <= 0) continue;
      // Bilinear sample on the ring, on the ray from the centre through this pixel.
      const sx = clamp(cx + (dx / r) * ringR, 0, maxX);
      const sy = clamp(cy + (dy / r) * ringR, 0, maxY);
      const x0 = sx | 0;
      const y0 = sy | 0;
      const x1 = x0 < maxX ? x0 + 1 : x0;
      const y1 = y0 < maxY ? y0 + 1 : y0;
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * width + x0) * 4;
      const i10 = (y0 * width + x1) * 4;
      const i01 = (y1 * width + x0) * 4;
      const i11 = (y1 * width + x1) * 4;
      const ch = (k: number) => {
        const top = src[i00 + k] + (src[i10 + k] - src[i00 + k]) * fx;
        const bot = src[i01 + k] + (src[i11 + k] - src[i01 + k]) * fx;
        return top + (bot - top) * fy;
      };
      colour.apply(ch(0), ch(1), ch(2), d / lengthPx);
      over(L, (y * width + x) * 4, out, w);
    }
  }
}

/**
 * Applies the "energy" pixel-streak effect.
 *
 * Lines of pixels at each axis (or a ring, in burst mode) are sampled and smeared across the affected area,
 * producing light-trail streaks, which are then laid over the photo. The input must be tightly packed RGBA
 * (4 bytes per pixel). Returns a new buffer (or fills `out`, which may be `src`).
 */
export function applyEnergy(
  src: PixelBuffer,
  width: number,
  height: number,
  params: Partial<EffectParams>,
  out?: PixelBuffer,
  options: RenderOptions = {},
): PixelBuffer {
  const bytes = width * height * 4;
  if (src.length < bytes) {
    throw new Error(`Expected ${bytes} bytes of RGBA data, got ${src.length}`);
  }
  const mask = options.mask ?? null;
  if (mask && mask.length < width * height) {
    throw new Error(`Expected a ${width}x${height} mask, got ${mask.length} bytes`);
  }
  const dst: PixelBuffer = out ?? new Uint8ClampedArray(bytes);
  if (width < 2 || height < 2) {
    if (dst !== src) dst.set(src.subarray(0, bytes));
    return dst;
  }

  const e = normalizeEffect(params);
  const colour = new Colour(e);
  const L = layerBuffer(bytes);
  if (e.mode === 'burst') {
    burstPass(src, width, height, e, L, colour);
  } else {
    axisPass(src, width, height, e, { area: e.area, axis: e.axis }, L, colour);
    for (const extra of e.extraAxes) axisPass(src, width, height, e, extra, L, colour);
  }

  // Lay the streaks over the photo (or hand back the streaks alone), keeping the protected subject.
  for (let p = 0, i = 0; i < bytes; p++, i += 4) {
    let a = L[i + 3] / 255;
    if (mask && a > 0) a *= 1 - mask[p] / 255;
    if (options.layer) {
      dst[i] = L[i];
      dst[i + 1] = L[i + 1];
      dst[i + 2] = L[i + 2];
      dst[i + 3] = a * 255;
    } else if (a <= 0) {
      if (dst !== src) {
        dst[i] = src[i];
        dst[i + 1] = src[i + 1];
        dst[i + 2] = src[i + 2];
        dst[i + 3] = src[i + 3];
      }
    } else {
      dst[i] = src[i] + (L[i] - src[i]) * a;
      dst[i + 1] = src[i + 1] + (L[i + 1] - src[i + 1]) * a;
      dst[i + 2] = src[i + 2] + (L[i + 2] - src[i + 2]) * a;
      dst[i + 3] = src[i + 3];
    }
  }
  return dst;
}
