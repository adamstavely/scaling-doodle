/**
 * How streaks travel away from the axis.
 *  - straight : the axis line is pulled straight across
 *  - angle    : trails tilt with distance
 *  - flare    : trails fan out from the centre
 *  - wave     : trails ripple as they travel
 *  - mirror   : the other side of the axis is reflected, stretching into streaks with distance
 *  - burst    : radial zoom: a ring around a centre point streaks outwards (area and extra axes don't apply;
 *               `axis` is the ring's radius)
 */
export type EffectMode = 'angle' | 'straight' | 'flare' | 'wave' | 'mirror' | 'burst';

/**
 * Which part of the frame is replaced by streaks.
 *  - left / right : vertical axis, horizontal streaks on that side
 *  - top / bottom : horizontal axis, vertical streaks on that side
 *  - full         : vertical axis, horizontal streaks on both sides
 */
export type AffectedArea = 'top' | 'left' | 'bottom' | 'right' | 'full';

/** A further axis, streaked with the same settings as the main one. */
export interface AxisLayer {
  area: AffectedArea;
  /** Position as a fraction of the frame (0..1). */
  axis: number;
}

export interface EffectParams {
  mode: EffectMode;
  area: AffectedArea;
  /** Axis position as a fraction of the frame (0..1). In burst mode, the ring radius as a fraction of the half diagonal. */
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
  /** Ripple strength, used by `wave` mode (0..1). */
  wave: number;
  /** How far streaks reach, as a fraction of the affected region (0.05..1); past that the photo shows again. */
  length: number;
  /** How much streaks fade out towards their end (0..1). */
  fade: number;
  /** Centre of a burst, as fractions of the frame (0..1). */
  centerX: number;
  centerY: number;
  /** Hue rotation of the streaks in degrees (-180..180). */
  hue: number;
  /** Saturation of the streaks: 0 grey, 1 unchanged, 2 doubled. */
  saturation: number;
  /** How strongly the streaks take the tint gradient (0..1). */
  tintAmount: number;
  /** Tint at the axis and at the far end of the streaks, as #rrggbb. */
  tintStart: string;
  tintEnd: string;
  /** Brightens the streaks near the axis (0..1). */
  glow: number;
  /** Further axes (up to 3), drawn with the same settings. Ignored in burst mode. */
  extraAxes: AxisLayer[];
}

/** The numeric settings keyframed motion can animate. */
export type AnimatableField =
  | 'axis'
  | 'blending'
  | 'angle'
  | 'flare'
  | 'wave'
  | 'length'
  | 'fade'
  | 'centerX'
  | 'centerY'
  | 'hue'
  | 'saturation'
  | 'tintAmount'
  | 'glow'
  | 'sampleOffset';

export type Keyframe = Partial<Pick<EffectParams, AnimatableField>>;

export type AspectPreset = 'original' | '16:9' | '4:5' | '9:16' | '1:1' | 'custom';

export interface AspectSetting {
  preset: AspectPreset;
  /** Used when preset is `custom`. */
  customWidth: number;
  customHeight: number;
  /** The point the crop centres on, as fractions of the source (0..1). Defaults to the middle. */
  focusX?: number;
  focusY?: number;
}

/** sweep / flow / pulse are presets; keyframes animates between a start and an end look. */
export type MotionType = 'sweep' | 'flow' | 'pulse' | 'keyframes';
export type MotionLoop = 'loop' | 'pingpong';

export interface MotionParams {
  type: MotionType;
  /** Strength of the motion (0..1). Not used by keyframes. */
  amount: number;
  /** Seconds for one cycle. */
  duration: number;
  loop: MotionLoop;
  /** Ease in/out each cycle. */
  easing: boolean;
  /** Start and end look for `keyframes`. Fields missing from either end keep the current setting. */
  keyframes?: { from: Keyframe; to: Keyframe };
}

export interface Size {
  width: number;
  height: number;
}

/** Options for applyEnergy beyond the effect itself. */
export interface RenderOptions {
  /**
   * Protect mask, one byte per output pixel (0 = streak freely, 255 = keep the photo). Keeps a subject in front of
   * the streaks.
   */
  mask?: Uint8Array | Uint8ClampedArray | null;
  /** Output only the streaks, with transparency where the photo would show (for compositing elsewhere). */
  layer?: boolean;
}
