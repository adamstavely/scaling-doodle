import { EffectParams } from './types';

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
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Applies the "energy" pixel-streak effect.
 *
 * A single line of pixels at the axis is sampled and smeared across the
 * affected area, producing light-trail streaks. The input must be tightly
 * packed RGBA (4 bytes per pixel). Returns a new buffer (or fills `out`).
 */
export function applyEnergy(
  src: PixelBuffer,
  width: number,
  height: number,
  params: EffectParams,
  out?: PixelBuffer,
): PixelBuffer {
  if (src.length < width * height * 4) {
    throw new Error(`Expected ${width * height * 4} bytes of RGBA data, got ${src.length}`);
  }
  const dst: PixelBuffer = out ?? new Uint8ClampedArray(width * height * 4);
  if (dst !== src) dst.set(src.subarray(0, width * height * 4));
  if (width < 2 || height < 2) return dst;

  // Read everything off `params` once: callers may pass reactive proxies.
  const mode = params.mode;
  const horizontal = params.area === 'left' || params.area === 'right' || params.area === 'full';
  // "along" is the axis the streaks travel on, "across" is perpendicular to it.
  const along = horizontal ? width : height;
  const across = horizontal ? height : width;
  const strideAlong = horizontal ? 4 : width * 4;
  const strideAcross = horizontal ? width * 4 : 4;

  const axisPos = clamp(params.axis, 0, 1) * (along - 1);
  const samplePos = clamp(axisPos + params.sampleOffset * along, 0, along - 1);

  // Extract the line of pixels the streaks are made from (linear interpolation between columns/rows).
  const line = new Float32Array(across * 4);
  const s0 = Math.floor(samplePos);
  const s1 = Math.min(s0 + 1, along - 1);
  const sf = samplePos - s0;
  for (let c = 0; c < across; c++) {
    const i0 = c * strideAcross + s0 * strideAlong;
    const i1 = c * strideAcross + s1 * strideAlong;
    for (let k = 0; k < 4; k++) line[c * 4 + k] = src[i0 + k] * (1 - sf) + src[i1 + k] * sf;
  }

  const before = axisPos; // length of the region on the low side of the axis
  const after = along - 1 - axisPos; // length on the high side
  let regionLength: number;
  let lo: number; // first affected index along
  let hi: number; // last affected index along
  switch (params.area) {
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

  const blendWidth = clamp(params.blending, 0, 1) * regionLength;
  const tilt = mode === 'angle' ? Math.tan((clamp(params.angle, -75, 75) * Math.PI) / 180) : 0;
  const flare = mode === 'flare' ? clamp(params.flare, 0, 1) * 3 : 0;
  const centre = (across - 1) / 2;
  const maxC = across - 1;

  for (let a = lo; a <= hi; a++) {
    const s = a - axisPos;
    const d = Math.abs(s);

    let w = 1;
    if (blendWidth > 0 && d < blendWidth) {
      const t = d / blendWidth;
      w = t * t * (3 - 2 * t);
    }
    const flareDiv = 1 + flare * (d / regionLength);

    for (let c = 0; c < across; c++) {
      let cp: number;
      if (mode === 'angle') cp = c + s * tilt;
      else if (mode === 'flare') cp = centre + (c - centre) / flareDiv;
      else cp = c;

      cp = cp < 0 ? 0 : cp > maxC ? maxC : cp;
      const c0 = cp | 0;
      const c1 = c0 < maxC ? c0 + 1 : c0;
      const cf = cp - c0;
      const l0 = c0 * 4;
      const l1 = c1 * 4;
      const idx = c * strideAcross + a * strideAlong;

      for (let k = 0; k < 4; k++) {
        const streak = line[l0 + k] + (line[l1 + k] - line[l0 + k]) * cf;
        dst[idx + k] = w === 1 ? streak : src[idx + k] + (streak - src[idx + k]) * w;
      }
    }
  }
  return dst;
}
