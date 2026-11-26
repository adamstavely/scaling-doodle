import { Module } from '@nestjs/common';
import { ImagesModule } from '../images/images.module';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';

@Module({
  imports: [ImagesModule],
  controllers: [RenderController],
  providers: [RenderService],
})
export class RenderModule {}
