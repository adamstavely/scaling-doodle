import { Module } from '@nestjs/common';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { SubjectService } from './subject.service';

@Module({
  controllers: [ImagesController],
  providers: [ImagesService, SubjectService],
  exports: [ImagesService],
})
export class ImagesModule {}
