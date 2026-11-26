import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AnimationDto, RenderDto } from './dto/render.dto';
import { RenderResult, RenderService } from './render.service';

@Controller('render')
export class RenderController {
  constructor(private readonly renderer: RenderService) {}

  @Post()
  @HttpCode(200)
  async render(@Body() dto: RenderDto, @Res() res: Response) {
    const out = await this.renderer.render(dto);
    const ext = dto.format === 'jpeg' ? 'jpg' : dto.format;
    send(res, out, `energy-studio${dto.layer ? '-streaks' : ''}-${out.width}x${out.height}.${ext}`);
  }

  /** Animated GIF or WebP of the motion, rendered frame by frame. */
  @Post('animation')
  @HttpCode(200)
  async animation(@Body() dto: AnimationDto, @Res() res: Response) {
    const out = await this.renderer.animate(dto);
    send(res, out, `energy-studio-${out.width}x${out.height}.${dto.format}`);
  }
}

function send(res: Response, out: RenderResult, filename: string) {
  res
    .type(out.mime)
    .set('Content-Disposition', `attachment; filename="${filename}"`)
    .set('X-Image-Width', String(out.width))
    .set('X-Image-Height', String(out.height))
    .send(out.buffer);
}
