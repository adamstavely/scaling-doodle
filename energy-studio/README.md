# Energy Studio

Add energy and motion to a still image. Pick an axis line in a photo and Energy Studio pulls that single row or
column of pixels across the frame as light-trail streaks. You can then animate the streaks and export a looping video.

- **Vue 3 + Vite** client (`apps/web`): live canvas preview, image and motion settings, video export.
- **NestJS** API (`apps/server`): image upload and full-resolution renders with `sharp`.
- **Shared engine** (`packages/core`): the pixel-streak effect as plain TypeScript. The browser preview and the
  server render use the same code, so downloads match the preview exactly.

```
energy-studio/
├── packages/core     effect, aspect/crop maths, motion curves (no dependencies)
├── apps/server       NestJS API  → /api/*
└── apps/web          Vue 3 SPA   → served by the API in production
```

## Running it

Requires Node 20+.

```bash
cd energy-studio
npm install

# development: two terminals
npm run dev:server     # API on http://localhost:3300/api (builds core first)
npm run dev:web        # UI on http://localhost:5173, proxies /api to :3300

# production: one process serves the API and the built UI
npm run build
npm start              # http://localhost:3300

npm test               # core unit tests + API e2e tests
```

The UI still works if the API is down. The preview runs in the browser, and image downloads fall back to an
in-browser render. The footer shows which mode is active.

### Configuration (server env vars)

| Variable          | Default                | Purpose                                         |
| ----------------- | ---------------------- | ----------------------------------------------- |
| `PORT`            | `3300`                 | HTTP port                                       |
| `UPLOAD_DIR`      | `./uploads`            | Where uploaded source images are stored         |
| `MAX_UPLOAD_MB`   | `40`                   | Upload size limit                               |
| `MAX_RENDER_EDGE` | `4096`                 | Longest edge of a server render                 |
| `WEB_DIST`        | `../web/dist`          | Built UI to serve (skipped if it doesn't exist) |
| `CORS_ORIGIN`     | reflect request origin | CORS origin for split deployments               |

The default port is 3300 so it can run alongside intellect-api on 3000. If you change it, point the dev UI at it
with `ENERGY_STUDIO_API_URL=http://localhost:<port> npm run dev:web`. On the client, set `VITE_API_BASE` if the API
isn't at `/api` on the same origin.

## Controls

**Image settings**

| Control           | Effect                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Aspect            | Original, 16:9, 4:5, 9:16, 1:1 or custom pixel size, centre-cropped                        |
| Mode              | **Straight** horizontal/vertical trails · **Angle** tilted trails · **Flare** fanned trails |
| Affected area     | Top · Left · Bottom · Right · Full frame (both sides of the axis)                          |
| Axis position     | Where the sampled line sits. You can also drag on the preview or use the arrow keys        |
| Blending          | Soft transition between the untouched image and the streaks                                |

**Motion settings**: **Sweep** moves the edge, **Flow** streams the streak colours while the edge holds still, and
**Pulse** makes the streaks breathe. You can also set intensity, cycle duration, ping-pong or loop, and easing.
Video export records MP4 (or WebM where MP4 recording isn't supported) in the browser at a 720, 1280 or 1920 long
edge.

## How the effect works

`applyEnergy(rgba, width, height, params)` in `packages/core/src/effect.ts`:

1. Read the line of pixels at `axis` (plus a `sampleOffset`, which the Flow motion animates).
2. For each pixel in the affected area, at distance `d` from the axis, take a colour from that line:
   - straight: same row/column
   - angle: offset by `d · tan(angle)`
   - flare: pulled toward the centre by `1 + flare·3·d/L`, so trails fan out as they travel
3. Within `blending · L` of the axis, cross-fade from the original pixel with a smoothstep.

Motion is `paramsAtTime(effect, motion, t)`, which returns the effect parameters for time `t`. The server can render
any frame of the animation (`motion` + `time` in the render request).

## API

| Method | Path                    | Body / result                                                                    |
| ------ | ----------------------- | -------------------------------------------------------------------------------- |
| GET    | `/api/health`           | `{ status: "ok" }`                                                               |
| POST   | `/api/images`           | multipart `image` → `{ id, width, height, format, bytes }` (EXIF-oriented size) |
| GET    | `/api/images/:id`       | image metadata                                                                   |
| GET    | `/api/images/:id/file`  | original upload                                                                  |
| POST   | `/api/render`           | JSON below → PNG/JPEG/WebP attachment                                            |

```json
{
  "imageId": "uuid",
  "effect": { "mode": "straight", "area": "left", "axis": 0.4, "blending": 0.1, "angle": 18, "flare": 0.5, "sampleOffset": 0 },
  "aspect": { "preset": "16:9", "customWidth": 1200, "customHeight": 628 },
  "motion": { "type": "flow", "amount": 0.35, "duration": 4, "loop": "pingpong", "easing": true },
  "time": 1.25,
  "maxLongEdge": 4096,
  "format": "png"
}
```

`motion` and `time` are optional. All fields are validated with `class-validator`, and unknown fields are rejected.

## Possible next steps

- Server-side video export (ffmpeg) for frame-exact, higher-bitrate renders and GIF output
- Upload cleanup (TTL) or object storage (S3/GCS) in place of the local `uploads/` directory
- Brand presets (colour grading, logo lock-ups) and saved settings per user
