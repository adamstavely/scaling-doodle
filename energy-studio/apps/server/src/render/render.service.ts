import { Injectable } from '@nestjs/common';
import { applyEnergy, coverCrop, outputSize, paramsAtTime, resolveAspectRatio } from '@energy-studio/core';
import sharp from 'sharp';
import { config } from '../config';
import { ImagesService } from '../images/images.service';
import { RenderDto } from './dto/render.dto';

export interface RenderResult {
  buffer: Buffer;
  mime: string;
  width: number;
  height: number;
}

/** Full-resolution renders using the same effect code as the browser preview. */
@Injectable()
export class RenderService {
  constructor(private readonly images: ImagesService) {}

  async render(dto: RenderDto): Promise<RenderResult> {
    const { info, path } = await this.images.get(dto.imageId);
    const source = { width: info.width, height: info.height };
    const crop = coverCrop(source, resolveAspectRatio(dto.aspect, source));
    const size = outputSize(dto.aspect, source, Math.min(dto.maxLongEdge ?? config.maxRenderEdge, config.maxRenderEdge));

    // autoOrient first so the crop is taken in display orientation, matching the browser.
    const { data, info: raw } = await sharp(path)
      .autoOrient()
      .extract({ left: crop.sx, top: crop.sy, width: crop.sw, height: crop.sh })
      .resize(size.width, size.height, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const effect =
      dto.motion && dto.time !== undefined ? paramsAtTime(dto.effect, dto.motion, dto.time) : dto.effect;
    applyEnergy(data, raw.width, raw.height, effect, data);

    const image = sharp(data, { raw: { width: raw.width, height: raw.height, channels: 4 } });
    const format = dto.format ?? 'png';
    const buffer =
      format === 'jpeg'
        ? await image.flatten({ background: '#000' }).jpeg({ quality: 92, mozjpeg: true }).toBuffer()
        : format === 'webp'
          ? await image.webp({ quality: 92 }).toBuffer()
          : await image.png({ compressionLevel: 6 }).toBuffer();

    return { buffer, mime: `image/${format}`, width: raw.width, height: raw.height };
  }
}
