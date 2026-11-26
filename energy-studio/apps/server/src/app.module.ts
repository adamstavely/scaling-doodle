import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ImagesModule } from './images/images.module';
import { RenderModule } from './render/render.module';

@Module({
  imports: [ImagesModule, RenderModule],
  controllers: [HealthController],
})
export class AppModule {}
