/** How streaks travel away from the axis. */
export type EffectMode = 'angle' | 'straight' | 'flare';

/**
 * Which part of the frame is replaced by streaks.
 *  - left / right : vertical axis, horizontal streaks on that side
 *  - top / bottom : horizontal axis, vertical streaks on that side
 *  - full         : vertical axis, horizontal streaks on both sides
 */
export type AffectedArea = 'top' | 'left' | 'bottom' | 'right' | 'full';

export interface EffectParams {
  mode: EffectMode;
  area: AffectedArea;
  /** Axis position as a fraction of the frame (0..1). */
  axis: number;
  /** Width of the soft transition at the axis, as a fraction of the affected region (0..1). */
  blending: number;
  /** Streak tilt in degrees, used by `angle` mode (-75..75). */
  angle: number;
  /** How strongly streaks fan out, used by `flare` mode (0..1). */
  flare: number;
  /**
   * Offset of the sampled line from the axis, as a fraction of the frame (-0.5..0.5).
   * Lets the streak colours change without moving the hard edge. Driven by motion.
   */
  sampleOffset: number;
}

export type AspectPreset = 'original' | '16:9' | '4:5' | '9:16' | '1:1' | 'custom';

export interface AspectSetting {
  preset: AspectPreset;
  /** Used when preset is `custom`. */
  customWidth: number;
  customHeight: number;
}

export type MotionType = 'sweep' | 'flow' | 'pulse';
export type MotionLoop = 'loop' | 'pingpong';

export interface MotionParams {
  type: MotionType;
  /** Strength of the motion (0..1). */
  amount: number;
  /** Seconds for one cycle. */
  duration: number;
  loop: MotionLoop;
  /** Ease in/out each cycle. */
  easing: boolean;
}

export interface Size {
  width: number;
  height: number;
}
