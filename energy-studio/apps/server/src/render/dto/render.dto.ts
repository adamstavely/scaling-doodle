import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { AffectedArea, AspectPreset, EffectMode, MotionLoop, MotionType } from '@energy-studio/core';

const AREAS = ['top', 'left', 'bottom', 'right', 'full'];
const HEX = /^#[0-9a-f]{6}$/i;

export class AxisLayerDto {
  @IsIn(AREAS)
  area: AffectedArea;

  @IsNumber() @Min(0) @Max(1)
  axis: number;
}

/** Fields added after the first release are optional, so older clients keep working. */
export class EffectDto {
  @IsIn(['angle', 'straight', 'flare', 'wave', 'mirror', 'burst'])
  mode: EffectMode;

  @IsIn(AREAS)
  area: AffectedArea;

  @IsNumber() @Min(0) @Max(1)
  axis: number;

  @IsNumber() @Min(0) @Max(1)
  blending: number;

  @IsNumber() @Min(-75) @Max(75)
  angle: number;

  @IsNumber() @Min(0) @Max(1)
  flare: number;

  @IsOptional() @IsNumber() @Min(-0.5) @Max(0.5)
  sampleOffset = 0;

  @IsOptional() @IsNumber() @Min(0) @Max(1)
  wave?: number;

  @IsOptional() @IsNumber() @Min(0.05) @Max(1)
  length?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(1)
  fade?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(1)
  centerX?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(1)
  centerY?: number;

  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  hue?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(2)
  saturation?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(1)
  tintAmount?: number;

  @IsOptional() @IsString() @Matches(HEX)
  tintStart?: string;

  @IsOptional() @IsString() @Matches(HEX)
  tintEnd?: string;

  @IsOptional() @IsNumber() @Min(0) @Max(1)
  glow?: number;

  @IsOptional() @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => AxisLayerDto)
  extraAxes?: AxisLayerDto[];
}

export class AspectDto {
  @IsIn(['original', '16:9', '4:5', '9:16', '1:1', 'custom'])
  preset: AspectPreset;

  @IsInt() @Min(16) @Max(8192)
  customWidth: number;

  @IsInt() @Min(16) @Max(8192)
  customHeight: number;

  @IsOptional() @IsNumber() @Min(0) @Max(1)
  focusX?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(1)
  focusY?: number;
}

/** One end of keyframed motion: any of the animatable settings. */
export class KeyframeDto {
  @IsOptional() @IsNumber() @Min(0) @Max(1) axis?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) blending?: number;
  @IsOptional() @IsNumber() @Min(-75) @Max(75) angle?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) flare?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) wave?: number;
  @IsOptional() @IsNumber() @Min(0.05) @Max(1) length?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) fade?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) centerX?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) centerY?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) hue?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(2) saturation?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) tintAmount?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) glow?: number;
  @IsOptional() @IsNumber() @Min(-0.5) @Max(0.5) sampleOffset?: number;
}

export class KeyframesDto {
  @ValidateNested() @Type(() => KeyframeDto)
  from: KeyframeDto;

  @ValidateNested() @Type(() => KeyframeDto)
  to: KeyframeDto;
}

export class MotionDto {
  @IsIn(['sweep', 'flow', 'pulse', 'keyframes'])
  type: MotionType;

  @IsNumber() @Min(0) @Max(1)
  amount: number;

  @IsNumber() @Min(0.5) @Max(30)
  duration: number;

  @IsIn(['loop', 'pingpong'])
  loop: MotionLoop;

  @IsBoolean()
  easing: boolean;

  @IsOptional() @ValidateNested() @Type(() => KeyframesDto)
  keyframes?: KeyframesDto;
}

/** What every render shares: the image, the look, the crop, and the subject to keep in front. */
export class LookDto {
  @IsUUID()
  imageId: string;

  @ValidateNested() @Type(() => EffectDto)
  effect: EffectDto;

  @ValidateNested() @Type(() => AspectDto)
  aspect: AspectDto;

  /**
   * Protect mask as a PNG data URL, drawn over the whole source image (any resolution, same proportions): white keeps
   * the photo in front of the streaks, black lets them through.
   */
  @IsOptional() @IsString() @MaxLength(8_000_000) @Matches(/^data:image\/png;base64,/)
  mask?: string;
}

export class RenderDto extends LookDto {
  /** When set together with `time`, the frame of the animation at that moment is rendered. */
  @IsOptional() @ValidateNested() @Type(() => MotionDto)
  motion?: MotionDto;

  @IsOptional() @IsNumber() @Min(0)
  time?: number;

  @IsOptional() @IsInt() @Min(64) @Max(8192)
  maxLongEdge?: number;

  @IsOptional() @IsIn(['png', 'jpeg', 'webp'])
  format: 'png' | 'jpeg' | 'webp' = 'png';

  /** Only the streaks, transparent where the photo would show (PNG or WebP). */
  @IsOptional() @IsBoolean()
  layer?: boolean;
}

export class AnimationDto extends LookDto {
  @ValidateNested() @Type(() => MotionDto)
  motion: MotionDto;

  @IsIn(['gif', 'webp'])
  format: 'gif' | 'webp';

  @IsOptional() @IsInt() @Min(5) @Max(30)
  fps = 15;

  @IsNumber() @Min(0.5) @Max(30)
  seconds: number;

  @IsOptional() @IsInt() @Min(64) @Max(1280)
  maxLongEdge = 720;
}
