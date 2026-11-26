import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Shared by main.ts and the e2e tests so both run the same pipeline. Create the app with `bodyParser: false`:
 * masks travel as PNG data URLs, so JSON bodies may be up to 12 MB.
 */
export function configureApp(app: INestApplication) {
  (app as NestExpressApplication).useBodyParser('json', { limit: '12mb' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
