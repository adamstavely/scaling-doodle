import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RenderDto } from './dto/render.dto';
import { RenderService } from './render.service';

@Controller('render')
export class RenderController {
  constructor(private readonly renderer: RenderService) {}

  @Post()
  @HttpCode(200)
  async render(@Body() dto: RenderDto, @Res() res: Response) {
    const out = await this.renderer.render(dto);
    const ext = dto.format === 'jpeg' ? 'jpg' : dto.format;
    res
      .type(out.mime)
      .set('Content-Disposition', `attachment; filename="energy-studio-${out.width}x${out.height}.${ext}"`)
      .set('X-Image-Width', String(out.width))
      .set('X-Image-Height', String(out.height))
      .send(out.buffer);
  }
}
