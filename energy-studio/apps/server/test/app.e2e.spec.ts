import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import request from 'supertest';

const uploadDir = mkdtempSync(join(tmpdir(), '.energy-studio-')); // a dot-folder, like a checkout under .claude/
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
    app = mod.createNestApplication({ bodyParser: false });
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

  it('serves the stored file', async () => {
    const res = await request(app.getHttpServer()).get(`/api/images/${imageId}/file`).expect(200).expect('Content-Type', /image\/png/);
    expect(res.body.length).toBeGreaterThan(0);
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

  const square = { preset: '1:1', customWidth: 100, customHeight: 100 };
  const original = { preset: 'original', customWidth: 100, customHeight: 100 };

  it('accepts the newer effect settings', () =>
    request(app.getHttpServer())
      .post('/api/render')
      .send({
        imageId,
        effect: {
          ...effect, mode: 'wave', wave: 0.5, length: 0.6, fade: 0.3, hue: 40, saturation: 1.3, tintAmount: 0.4,
          tintStart: '#112233', tintEnd: '#ffeedd', glow: 0.2, extraAxes: [{ area: 'right', axis: 0.8 }],
        },
        aspect: { ...square, focusX: 0.2, focusY: 0.8 },
      })
      .expect(200));

  it('renders only the streaks as a transparent layer, and refuses JPEG for it', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/render')
      .send({ imageId, effect: { ...effect, axis: 0.5 }, aspect: original, layer: true })
      .expect(200);
    const { data, info } = await pixels(res.body);
    expect(data[3]).toBe(255); // left of the axis: streak
    expect(data[(info.width - 1) * 4 + 3]).toBe(0); // right of it: transparent
    await request(app.getHttpServer())
      .post('/api/render')
      .send({ imageId, effect, aspect: original, layer: true, format: 'jpeg' })
      .expect(400);
  });

  it('keeps the masked subject in front of the streaks', async () => {
    // Display image is 20x40: protect its top-left quarter.
    const raw = Buffer.alloc(20 * 40);
    for (let y = 0; y < 20; y++) for (let x = 0; x < 10; x++) raw[y * 20 + x] = 255;
    const png = await sharp(raw, { raw: { width: 20, height: 40, channels: 1 } }).png().toBuffer();
    // Axis at the bottom-right column: the streaks paint blue (the bottom half's colour) only where rows are blue,
    // so use a vertical effect from the bottom edge instead: every column becomes its bottom (blue) pixel.
    const res = await request(app.getHttpServer())
      .post('/api/render')
      .send({
        imageId,
        effect: { ...effect, area: 'top', axis: 1 },
        aspect: original,
        mask: `data:image/png;base64,${png.toString('base64')}`,
      })
      .expect(200);
    const { data } = await pixels(res.body);
    expect([data[0], data[2]]).toEqual([255, 0]); // protected: still red
    const unprotected = (0 * 20 + 15) * 4;
    expect([data[unprotected], data[unprotected + 2]]).toEqual([0, 255]); // streaked blue
  });

  it('renders an animated GIF and WebP of the motion', async () => {
    for (const format of ['gif', 'webp']) {
      const res = await request(app.getHttpServer())
        .post('/api/render/animation')
        .send({
          imageId, effect: { ...effect, area: 'top', axis: 0.5 }, aspect: original, format, fps: 10, seconds: 1,
          motion: { type: 'keyframes', amount: 0, duration: 1, loop: 'pingpong', easing: false,
            keyframes: { from: { axis: 0.2 }, to: { axis: 0.8 } } },
        })
        .expect(200)
        .expect('Content-Type', new RegExp(`image/${format}`));
      // The encoders merge identical neighbouring frames, so count "more than one" rather than exactly 10.
      const meta = await sharp(res.body, { animated: true }).metadata();
      expect(meta.pages).toBeGreaterThan(1);
    }
  });

  it('refuses animations that would be too large', () =>
    request(app.getHttpServer())
      .post('/api/render/animation')
      .send({ imageId, effect, aspect: { preset: 'custom', customWidth: 1280, customHeight: 1280 }, format: 'gif',
        fps: 30, seconds: 30, maxLongEdge: 1280, motion: { type: 'flow', amount: 0.3, duration: 4, loop: 'loop', easing: true } })
      .expect(400));

  it('refuses URLs on the private network', async () => {
    for (const url of ['http://127.0.0.1/a.png', 'http://localhost/a.png', 'http://[::1]/x', 'ftp://example.com/x.png', 'nonsense'])
      await request(app.getHttpServer()).post('/api/images/from-url').send({ url }).expect(400);
  });
});
