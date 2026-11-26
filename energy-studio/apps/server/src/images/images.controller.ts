import {
  BadRequestException,
  Controller,
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
import { config } from '../config';
import { ImagesService } from './images.service';

@Controller('images')
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  /** multipart/form-data with an `image` field. */
  @Post()
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: config.maxUploadBytes } }))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Missing "image" file field');
    return this.images.save(file.buffer);
  }

  @Get(':id')
  async meta(@Param('id', new ParseUUIDPipe()) id: string) {
    return (await this.images.get(id)).info;
  }

  @Get(':id/file')
  async file(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const { info, path } = await this.images.get(id);
    res.type(info.format === 'jpeg' ? 'image/jpeg' : `image/${info.format}`);
    res.sendFile(path);
  }
}
