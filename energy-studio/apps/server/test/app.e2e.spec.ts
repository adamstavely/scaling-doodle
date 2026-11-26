import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import request from 'supertest';

const uploadDir = mkdtempSync(join(tmpdir(), 'energy-studio-'));
process.env.UPLOAD_DIR = uploadDir;

// Imported after UPLOAD_DIR is set, since config reads it at load time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AppModule } = require('../src/app.module');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { configureApp } = require('../src/setup');

const effect = { mode: 'straight', area: 'left', axis: 1, blending: 0, angle: 18, flare: 0.5, sampleOffset: 0 };

/** 40x20 stored, left half red / right half blue, EXIF orientation 6 (display: 20x40, red on top). */
async function rotatedFixture() {
  const raw = Buffer.alloc(40 * 20 * 3);
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 40; x++) {
      const i = (y * 40 + x) * 3;
      if (x < 20) raw[i] = 255;
      else raw[i + 2] = 255;
    }
  return sharp(raw, { raw: { width: 40, height: 20, channels: 3 } }).withMetadata({ orientation: 6 }).png().toBuffer();
}

async function pixels(png: Buffer) {
  return sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

describe('Energy Studio API', () => {
  let app: INestApplication;
  let imageId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    rmSync(uploadDir, { recursive: true, force: true });
  });

  it('GET /api/health', () => request(app.getHttpServer()).get('/api/health').expect(200, { status: 'ok' }));

  it('uploads an image and reports display-oriented size', async () => {
    const res = await request(app.getHttpServer()).post('/api/images').attach('image', await rotatedFixture(), 'x.png').expect(201);
    expect(res.body).toMatchObject({ width: 20, height: 40, format: 'png' });
    imageId = res.body.id;
  });

  it('rejects non-images', () =>
    request(app.getHttpServer()).post('/api/images').attach('image', Buffer.from('hello'), 'x.txt').expect(400));

  it('renders with original aspect in display orientation', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/render')
      .send({ imageId, effect, aspect: { preset: 'original', customWidth: 100, customHeight: 100 } })
      .expect(200)
      .expect('Content-Type', /image\/png/);
    const { data, info } = await pixels(res.body);
    expect([info.width, info.height]).toEqual([20, 40]);
    expect([data[0], data[2]]).toEqual([255, 0]); // top-left: red
    const last = (39 * 20) * 4;
    expect([data[last], data[last + 2]]).toEqual([0, 255]); // bottom-left: blue
  });

  it('centre-crops to the requested aspect', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/render')
      .send({ imageId, effect, aspect: { preset: '1:1', customWidth: 100, customHeight: 100 }, format: 'png' })
      .expect(200);
    const { data, info } = await pixels(res.body);
    expect([info.width, info.height]).toEqual([20, 20]);
    expect(data[0]).toBe(255);
    expect(data[19 * 20 * 4 + 2]).toBe(255);
  });

  it('renders a motion frame as jpeg', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/render')
      .send({
        imageId,
        effect: { ...effect, axis: 0.5 },
        aspect: { preset: 'custom', customWidth: 64, customHeight: 32 },
        motion: { type: 'sweep', amount: 0.5, duration: 2, loop: 'pingpong', easing: true },
        time: 0.5,
        format: 'jpeg',
      })
      .expect(200)
      .expect('Content-Type', /image\/jpeg/);
    expect(res.headers['x-image-width']).toBe('64');
  });

  it('validates render params', () =>
    request(app.getHttpServer())
      .post('/api/render')
      .send({ imageId, effect: { ...effect, mode: 'spiral', axis: 3 }, aspect: { preset: '1:1', customWidth: 100, customHeight: 100 } })
      .expect(400));

  it('404s on unknown images', () =>
    request(app.getHttpServer())
      .post('/api/render')
      .send({ imageId: '00000000-0000-4000-8000-000000000000', effect, aspect: { preset: '1:1', customWidth: 100, customHeight: 100 } })
      .expect(404));
});
