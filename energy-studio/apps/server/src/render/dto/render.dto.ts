import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import type { AffectedArea, AspectPreset, EffectMode, MotionLoop, MotionType } from '@energy-studio/core';

export class EffectDto {
  @IsIn(['angle', 'straight', 'flare'])
  mode: EffectMode;

  @IsIn(['top', 'left', 'bottom', 'right', 'full'])
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
}

export class AspectDto {
  @IsIn(['original', '16:9', '4:5', '9:16', '1:1', 'custom'])
  preset: AspectPreset;

  @IsInt() @Min(16) @Max(8192)
  customWidth: number;

  @IsInt() @Min(16) @Max(8192)
  customHeight: number;
}

export class MotionDto {
  @IsIn(['sweep', 'flow', 'pulse'])
  type: MotionType;

  @IsNumber() @Min(0) @Max(1)
  amount: number;

  @IsNumber() @Min(0.5) @Max(30)
  duration: number;

  @IsIn(['loop', 'pingpong'])
  loop: MotionLoop;

  @IsBoolean()
  easing: boolean;
}

export class RenderDto {
  @IsUUID()
  imageId: string;

  @ValidateNested() @Type(() => EffectDto)
  effect: EffectDto;

  @ValidateNested() @Type(() => AspectDto)
  aspect: AspectDto;

  /** When set together with `time`, the frame of the animation at that moment is rendered. */
  @IsOptional() @ValidateNested() @Type(() => MotionDto)
  motion?: MotionDto;

  @IsOptional() @IsNumber() @Min(0)
  time?: number;

  @IsOptional() @IsInt() @Min(64) @Max(8192)
  maxLongEdge?: number;

  @IsOptional() @IsIn(['png', 'jpeg', 'webp'])
  format: 'png' | 'jpeg' | 'webp' = 'png';
}
