import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { basename, dirname } from 'node:path';
import { IsString, MaxLength } from 'class-validator';
import { config } from '../config';
import { fetchImage } from './fetch-image';
import { ImagesService } from './images.service';
import { SubjectService } from './subject.service';

export class FromUrlDto {
  @IsString() @MaxLength(2048)
  url: string;
}

@Controller('images')
export class ImagesController {
  constructor(
    private readonly images: ImagesService,
    private readonly subject: SubjectService,
  ) {}

  /** multipart/form-data with an `image` field. */
  @Post()
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: config.maxUploadBytes } }))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Missing "image" file field');
    return this.images.save(file.buffer);
  }

  /** Downloads a public image URL on the server (so the browser isn't blocked by CORS) and stores it like an upload. */
  @Post('from-url')
  async fromUrl(@Body() dto: FromUrlDto) {
    return this.images.save(await fetchImage(dto.url, config.maxUploadBytes));
  }

  /** The subject of the image as a greyscale PNG mask (white = subject), the size of the orientated image. */
  @Post(':id/subject')
  @HttpCode(200)
  async findSubject(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const { path } = await this.images.get(id);
    res.type('image/png').send(await this.subject.detect(path));
  }

  @Get(':id')
  async meta(@Param('id', new ParseUUIDPipe()) id: string) {
    return (await this.images.get(id)).info;
  }

  @Get(':id/file')
  async file(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const { info, path } = await this.images.get(id);
    res.type(info.format === 'jpeg' ? 'image/jpeg' : `image/${info.format}`);
    // Relative to the upload folder: sendFile refuses absolute paths that pass through a dot-folder.
    res.sendFile(basename(path), { root: dirname(path) });
  }
}
