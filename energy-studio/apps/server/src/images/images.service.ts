import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { config } from '../config';

export interface StoredImage {
  id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'heif']);

/** Stores uploaded source images on disk. Dimensions are reported after EXIF orientation. */
@Injectable()
export class ImagesService implements OnModuleInit {
  async onModuleInit() {
    await mkdir(config.uploadDir, { recursive: true });
  }

  async save(buffer: Buffer): Promise<StoredImage> {
    const meta = await sharp(buffer)
      .metadata()
      .catch(() => {
        throw new BadRequestException('File is not a readable image');
      });
    if (!meta.format || !ACCEPTED_FORMATS.has(meta.format) || !meta.width || !meta.height) {
      throw new BadRequestException(`Unsupported image format: ${meta.format ?? 'unknown'}`);
    }
    const id = randomUUID();
    const swap = (meta.orientation ?? 1) >= 5;
    const info: StoredImage = {
      id,
      width: swap ? meta.height : meta.width,
      height: swap ? meta.width : meta.height,
      format: meta.format,
      bytes: buffer.length,
    };
    await writeFile(this.filePath(id), buffer);
    await writeFile(this.metaPath(id), JSON.stringify(info));
    return info;
  }

  async get(id: string): Promise<{ info: StoredImage; path: string }> {
    try {
      await stat(this.filePath(id));
      const info = JSON.parse(await readFile(this.metaPath(id), 'utf8')) as StoredImage;
      return { info, path: this.filePath(id) };
    } catch {
      throw new NotFoundException(`Image ${id} not found`);
    }
  }

  // ids are validated as UUIDs by the controllers, so these paths cannot escape uploadDir.
  private filePath(id: string) {
    return join(config.uploadDir, `${id}.img`);
  }

  private metaPath(id: string) {
    return join(config.uploadDir, `${id}.json`);
  }
}
