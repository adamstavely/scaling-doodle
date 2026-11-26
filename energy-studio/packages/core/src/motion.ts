import { AnimatableField, EffectParams, MotionParams } from './types';

export const DEFAULT_MOTION: MotionParams = {
  type: 'flow',
  amount: 0.35,
  duration: 4,
  loop: 'pingpong',
  easing: true,
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Position within the current cycle (0..1), after looping and easing. */
export function motionProgress(motion: MotionParams, timeSeconds: number): number {
  const duration = Math.max(0.1, motion.duration);
  const p = ((timeSeconds % duration) + duration) % duration / duration;
  let u = motion.loop === 'pingpong' ? (p < 0.5 ? p * 2 : 2 - p * 2) : p;
  if (motion.easing) u = u * u * (3 - 2 * u);
  return u;
}

/** The settings keyframed motion animates between its start and end look. */
export const ANIMATABLE_FIELDS: AnimatableField[] = [
  'axis',
  'blending',
  'angle',
  'flare',
  'wave',
  'length',
  'fade',
  'centerX',
  'centerY',
  'hue',
  'saturation',
  'tintAmount',
  'glow',
  'sampleOffset',
];

/** The animatable part of a look, for storing as a keyframe. */
export function keyframeOf(effect: EffectParams) {
  const k: Partial<Record<AnimatableField, number>> = {};
  for (const f of ANIMATABLE_FIELDS) k[f] = effect[f];
  return k;
}

/** Effect parameters for a given moment of the animation. */
export function paramsAtTime(base: EffectParams, motion: MotionParams, timeSeconds: number): EffectParams {
  const u = motionProgress(motion, timeSeconds);
  const amount = clamp(motion.amount, 0, 1);
  const centred = u - 0.5; // -0.5..0.5
  switch (motion.type) {
    case 'sweep':
      // The hard edges travel back and forth around the chosen axes.
      return {
        ...base,
        axis: clamp(base.axis + centred * amount, 0, 1),
        extraAxes: (base.extraAxes ?? []).map((a) => ({ ...a, axis: clamp(a.axis + centred * amount, 0, 1) })),
      };
    case 'flow':
      // The edge stays put while the sampled line drifts, so streak colours stream.
      return { ...base, sampleOffset: base.sampleOffset + centred * amount * 0.25 };
    case 'pulse':
      // The streaks breathe: transition softens and tilt / fan swell.
      return {
        ...base,
        blending: clamp(base.blending + u * amount * 0.6, 0, 1),
        angle: base.angle * (1 - amount + amount * u * 2),
        flare: clamp(base.flare * (1 - amount + amount * u * 2), 0, 1),
        wave: clamp((base.wave ?? 0) * (1 - amount + amount * u * 2), 0, 1),
        glow: clamp((base.glow ?? 0) + u * amount * 0.5, 0, 1),
      };
    case 'keyframes': {
      // Every animatable setting set at either end moves from the start value to the end value.
      const from = motion.keyframes?.from ?? {};
      const to = motion.keyframes?.to ?? {};
      const next: EffectParams = { ...base };
      for (const f of ANIMATABLE_FIELDS) {
        const a = from[f] ?? base[f];
        const b = to[f] ?? base[f];
        if (typeof a === 'number' && typeof b === 'number') next[f] = a + (b - a) * u;
      }
      return next;
    }
    default:
      return base;
  }
}
