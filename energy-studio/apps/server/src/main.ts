import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { config } from './config';
import { configureApp } from './setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  configureApp(app);
  app.enableCors({ origin: config.corsOrigin, exposedHeaders: ['Content-Disposition', 'X-Image-Width', 'X-Image-Height'] });

  // In production the API also serves the built Vue app.
  if (existsSync(config.webDist)) {
    app.useStaticAssets(config.webDist);
    app.getHttpAdapter().getInstance().get(/^\/(?!api\/).*/, (_req: unknown, res: { sendFile: (p: string) => void }) =>
      res.sendFile(join(config.webDist, 'index.html')),
    );
  }

  await app.listen(config.port);
  Logger.log(`Energy Studio API on http://localhost:${config.port}/api`, 'Bootstrap');
}
bootstrap();
