import { EffectParams, MotionParams } from './types';

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

/** Effect parameters for a given moment of the animation. */
export function paramsAtTime(base: EffectParams, motion: MotionParams, timeSeconds: number): EffectParams {
  const u = motionProgress(motion, timeSeconds);
  const amount = clamp(motion.amount, 0, 1);
  const centred = u - 0.5; // -0.5..0.5
  switch (motion.type) {
    case 'sweep':
      // The hard edge travels back and forth around the chosen axis.
      return { ...base, axis: clamp(base.axis + centred * amount, 0, 1) };
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
      };
    default:
      return base;
  }
}
