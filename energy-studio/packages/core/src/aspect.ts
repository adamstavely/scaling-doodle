import { AspectPreset, AspectSetting, Size } from './types';

export const ASPECT_RATIOS: Record<Exclude<AspectPreset, 'original' | 'custom'>, number> = {
  '16:9': 16 / 9,
  '4:5': 4 / 5,
  '9:16': 9 / 16,
  '1:1': 1,
};

export const DEFAULT_ASPECT: AspectSetting = { preset: '16:9', customWidth: 1200, customHeight: 628 };

/** Width / height ratio the output should have. */
export function resolveAspectRatio(aspect: AspectSetting, source: Size): number {
  switch (aspect.preset) {
    case 'original':
      return source.width / source.height;
    case 'custom': {
      const w = Math.max(1, aspect.customWidth || 1);
      const h = Math.max(1, aspect.customHeight || 1);
      return w / h;
    }
    default:
      return ASPECT_RATIOS[aspect.preset];
  }
}

/**
 * Crop of the source that fills `ratio` (like CSS object-fit: cover), centred on the focus point (fractions of the
 * source, default the middle) as far as the image allows.
 */
export function coverCrop(
  source: Size,
  ratio: number,
  focusX = 0.5,
  focusY = 0.5,
): { sx: number; sy: number; sw: number; sh: number } {
  const place = (focus: number, full: number, part: number) =>
    Math.round(Math.min(full - part, Math.max(0, focus * full - part / 2)));
  const srcRatio = source.width / source.height;
  if (srcRatio > ratio) {
    const sw = Math.round(source.height * ratio);
    return { sx: place(focusX, source.width, sw), sy: 0, sw, sh: source.height };
  }
  const sh = Math.round(source.width / ratio);
  return { sx: 0, sy: place(focusY, source.height, sh), sw: source.width, sh };
}

/** The crop for an aspect setting, honouring its focus point. */
export function cropFor(aspect: AspectSetting, source: Size) {
  return coverCrop(source, resolveAspectRatio(aspect, source), aspect.focusX ?? 0.5, aspect.focusY ?? 0.5);
}

/**
 * Output pixel size for a ratio, bounded by `maxLongEdge` and never upscaling past the crop.
 * For a custom preset the exact requested size is honoured (within the bound).
 */
export function outputSize(aspect: AspectSetting, source: Size, maxLongEdge: number): Size {
  const ratio = resolveAspectRatio(aspect, source);
  const crop = coverCrop(source, ratio);
  let width: number;
  let height: number;
  if (aspect.preset === 'custom') {
    width = Math.max(1, Math.round(aspect.customWidth));
    height = Math.max(1, Math.round(aspect.customHeight));
  } else {
    width = crop.sw;
    height = crop.sh;
  }
  const scale = Math.min(1, maxLongEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
