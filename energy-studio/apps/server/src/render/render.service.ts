import { BadRequestException, Injectable } from '@nestjs/common';
import { applyEnergy, cropFor, outputSize, paramsAtTime, type EffectParams } from '@energy-studio/core';
import sharp from 'sharp';
import { config } from '../config';
import { ImagesService } from '../images/images.service';
import { AnimationDto, LookDto, RenderDto } from './dto/render.dto';

export interface RenderResult {
  buffer: Buffer;
  mime: string;
  width: number;
  height: number;
}

/** Most pixels (width × height × frames) one animation may hold in memory. */
const MAX_ANIMATION_PIXELS = 60_000_000;

/** Full-resolution renders using the same effect code as the browser preview. */
@Injectable()
export class RenderService {
  constructor(private readonly images: ImagesService) {}

  /** The cropped, scaled source pixels (RGBA) and the protect mask at the same size. */
  private async prepare(dto: LookDto, maxLongEdge: number) {
    const { info, path } = await this.images.get(dto.imageId);
    const source = { width: info.width, height: info.height };
    const crop = cropFor(dto.aspect, source);
    const size = outputSize(dto.aspect, source, Math.min(maxLongEdge, config.maxRenderEdge));

    // autoOrient first so the crop is taken in display orientation, matching the browser.
    const { data, info: raw } = await sharp(path)
      .autoOrient()
      .extract({ left: crop.sx, top: crop.sy, width: crop.sw, height: crop.sh })
      .resize(size.width, size.height, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const mask = dto.mask ? await this.maskFor(dto.mask, source, crop, raw.width, raw.height) : null;
    return { data, width: raw.width, height: raw.height, mask };
  }

  /** The mask is drawn over the whole source; take the same crop and scale it to the output. */
  private async maskFor(
    dataUrl: string,
    source: { width: number; height: number },
    crop: { sx: number; sy: number; sw: number; sh: number },
    width: number,
    height: number,
  ): Promise<Uint8Array> {
    const png = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    try {
      const meta = await sharp(png).metadata();
      const kx = (meta.width ?? 0) / source.width;
      const ky = (meta.height ?? 0) / source.height;
      const left = Math.min(Math.round(crop.sx * kx), (meta.width ?? 1) - 1);
      const top = Math.min(Math.round(crop.sy * ky), (meta.height ?? 1) - 1);
      const { data } = await sharp(png)
        .extract({
          left,
          top,
          width: Math.max(1, Math.min(Math.round(crop.sw * kx), (meta.width ?? 1) - left)),
          height: Math.max(1, Math.min(Math.round(crop.sh * ky), (meta.height ?? 1) - top)),
        })
        .resize(width, height, { fit: 'fill' })
        .flatten({ background: '#000' })
        .toColourspace('b-w')
        .raw()
        .toBuffer({ resolveWithObject: true });
      return new Uint8Array(data.buffer, data.byteOffset, width * height);
    } catch {
      throw new BadRequestException('The mask is not a readable PNG');
    }
  }

  async render(dto: RenderDto): Promise<RenderResult> {
    const format = dto.format ?? 'png';
    if (dto.layer && format === 'jpeg') throw new BadRequestException('A streak layer needs PNG or WebP (JPEG has no transparency)');
    const base = await this.prepare(dto, dto.maxLongEdge ?? config.maxRenderEdge);
    const effect = dto.motion && dto.time !== undefined ? paramsAtTime(dto.effect as EffectParams, dto.motion, dto.time) : dto.effect;
    applyEnergy(base.data, base.width, base.height, effect as EffectParams, base.data, { mask: base.mask, layer: dto.layer });

    const image = sharp(base.data, { raw: { width: base.width, height: base.height, channels: 4 } });
    const buffer =
      format === 'jpeg'
        ? await image.flatten({ background: '#000' }).jpeg({ quality: 92, mozjpeg: true }).toBuffer()
        : format === 'webp'
          ? await image.webp({ quality: 92, alphaQuality: 100 }).toBuffer()
          : await image.png({ compressionLevel: 6 }).toBuffer();

    return { buffer, mime: `image/${format}`, width: base.width, height: base.height };
  }

  /** A looping animated GIF or WebP, rendered frame by frame (frame-exact, unlike in-browser recording). */
  async animate(dto: AnimationDto): Promise<RenderResult> {
    const fps = dto.fps ?? 15;
    const frames = Math.max(1, Math.round(dto.seconds * fps));
    const base = await this.prepare(dto, dto.maxLongEdge ?? 720);
    if (base.width * base.height * frames > MAX_ANIMATION_PIXELS) {
      throw new BadRequestException(
        `That animation is too large (${frames} frames at ${base.width}×${base.height}). Use a smaller size, fewer seconds or a lower frame rate.`,
      );
    }
    const frameBytes = base.width * base.height * 4;
    const strip = Buffer.alloc(frameBytes * frames);
    for (let f = 0; f < frames; f++) {
      const params = paramsAtTime(dto.effect as EffectParams, dto.motion, f / fps);
      applyEnergy(base.data, base.width, base.height, params, strip.subarray(f * frameBytes, (f + 1) * frameBytes), {
        mask: base.mask,
      });
    }
    const delay = Array.from({ length: frames }, () => Math.round(1000 / fps));
    const image = sharp(strip, {
      raw: { width: base.width, height: base.height * frames, channels: 4, pageHeight: base.height },
    });
    const buffer =
      dto.format === 'gif'
        ? await image.gif({ loop: 0, delay, effort: 2, dither: 0.5 }).toBuffer()
        : await image.webp({ loop: 0, delay, quality: 82 }).toBuffer();
    return { buffer, mime: `image/${dto.format}`, width: base.width, height: base.height };
  }
}
