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
| `SUBJECT_MODEL`   | `onnx-community/BiRefNet_lite-ONNX` | Hugging Face model for **Find subject** |
| `SUBJECT_MODEL_CACHE` | `./.model-cache`   | Where that model (about 220 MB) is kept after its first download |

The default port is 3300 so it can run alongside intellect-api on 3000. If you change it, point the dev UI at it
with `ENERGY_STUDIO_API_URL=http://localhost:<port> npm run dev:web`. On the client, set `VITE_API_BASE` if the API
isn't at `/api` on the same origin.

## Design system

The UI uses [Trench Coat](https://github.com/adamstavely/legendary-chainsaw) in its Clean look. Trench Coat is
vendored as `vendor/adamstavely-trenchcoat-<version>.tgz`, so installs don't need GitHub Packages.

- **Components.** Trench Coat elements are used for the tabs, buttons, sliders, number fields, segmented choices,
  switch, progress bar and the Guidance dialog (`tc-*` tags, registered in `apps/web/src/main.ts`). The picture
  tiles for mode, affected area and motion are the app's own `OptionTile`.
- **Tokens.** Every style value is a design token. Trench Coat's tokens come from its DTCG files. Energy Studio's
  own tokens are in `apps/web/tokens/energy-studio.tokens.json` (DTCG format), and most of them alias Trench Coat's
  (`{tc.surface.tray}`). Run `npm run tokens -w @energy-studio/web` after editing that file. It writes
  `src/styles/tokens.css` as `--es-*` custom properties.
- **Checks.** `npm run lint -w @energy-studio/web` runs as part of the build. It fails when `tokens.css` is out of
  date, and when a stylesheet uses a raw colour, length, time or font, an inline style, or a `var()` that isn't a
  DTCG token. It also runs `trenchcoat lint` on the templates.
- **Type and icons.** Inter (`@fontsource-variable/inter`) for all text, and Lucide (`lucide-vue-next`) for all
  interface icons. The mode and affected-area pictures are custom drawings of the effect.

## Controls

**Image tab**

| Control         | Effect                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Aspect ratio    | Original, 16:9, 4:5, 9:16, 1:1 or a custom pixel size, cropped around the focus point                    |
| Mode            | **Straight** · **Angle** (tilted) · **Flare** (fanned) · **Wave** (rippling) · **Mirror** (the other side reflected and stretched) · **Burst** (radial zoom from a point you click) |
| Affected area   | Top · Left · Bottom · Right · Full frame (both sides of the axis)                                        |
| Axis position   | Where the sampled line sits (the ring's radius in Burst). Drag on the preview or use the arrow keys       |
| Blending        | Soft transition between the untouched image and the streaks                                              |
| Streak length   | How far the streaks reach before the photo shows again                                                   |
| Fade out        | How much the streaks thin out towards their end                                                          |
| More axes       | Up to three further axes, each with its own area and position                                            |
| Protect subject | **Find subject** (server-side model) or paint / erase a mask; the masked part stays in front of the streaks |

**Colour tab**: hue shift, saturation, glow near the axis, and a tint gradient from the axis to the far end of the
streaks (picked with Trench Coat's colour picker).

**Motion tab**: **Sweep** moves the edge, **Flow** streams the streak colours while the edge holds still, **Pulse**
makes the streaks breathe, and **Keyframes** moves from a start look to an end look that you set (any of the numeric
settings: axis, length, colour…). Also intensity, cycle duration, ping-pong or loop, and easing.

**Presets tab**: eight built-in looks with thumbnails rendered on your image, looks you save (kept in this browser),
and **Surprise me**.

**Preview**: before/after **Compare** (or press <kbd>\\</kbd>), zoom up to 800% (or <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + scroll),
undo / redo (<kbd>⌘Z</kbd> / <kbd>⇧⌘Z</kbd>, mask strokes included) and **Reset look**. Images come in by picking a
file, dropping one, pasting an image or a link, or typing an address (the server fetches it).

**Export**

| Format              | How it's made                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| PNG, JPEG, WebP     | Full resolution on the server (in the browser when it's unreachable)                              |
| Streaks only (PNG)  | Just the streaks on transparency, for compositing in a design tool                               |
| All social sizes    | 1:1, 4:5, 9:16 and 16:9 in one zip, each crop centred on the protected subject                   |
| GIF, animated WebP  | Frame by frame on the server, so every frame is exact; sized down to stay within a memory budget |
| Video               | MP4 (or WebM) recorded in the browser in real time at a 720, 1280 or 1920 long edge; can be cancelled |

## How the effect works

`applyEnergy(rgba, width, height, params)` in `packages/core/src/effect.ts`:

1. Read the line of pixels at each axis (plus a `sampleOffset`, which the Flow motion animates).
2. For each pixel in the affected area, at distance `d` from the axis and within `length · L`, take a colour from
   that line:
   - straight: same row/column
   - angle: offset by `d · tan(angle)`
   - flare: pulled toward the centre by `1 + flare·3·d/L`, so trails fan out as they travel
   - wave: offset by a sine of `d`
   - mirror: the pixel reflected across the axis, pulled towards it with distance so it stretches
   - burst: the pixel on a ring around the centre, along the ray through this pixel
3. Treat the colour (hue/saturation matrix, tint gradient, glow) and give it a weight: a smoothstep within
   `blending · L` of the axis, times the fade-out.
4. Lay the streaks of every axis over each other, then over the photo, except where the protect mask is set. With
   `layer: true`, return the streaks alone on transparency.

Motion is `paramsAtTime(effect, motion, t)`, which returns the effect parameters for time `t`. The server can render
any frame of the animation (`motion` + `time` in the render request).

## API

| Method | Path                    | Body / result                                                                    |
| ------ | ----------------------- | -------------------------------------------------------------------------------- |
| GET    | `/api/health`           | `{ status: "ok" }`                                                               |
| POST   | `/api/images`           | multipart `image` → `{ id, width, height, format, bytes }` (EXIF-oriented size) |
| GET    | `/api/images/:id`       | image metadata                                                                   |
| GET    | `/api/images/:id/file`  | original upload                                                                  |
| POST   | `/api/images/from-url`  | `{ url }` → stored like an upload. Public http(s) only; private addresses are refused, redirects re-checked |
| POST   | `/api/images/:id/subject` | → greyscale PNG mask of the main subject (white = subject)                     |
| POST   | `/api/render`           | JSON below → PNG/JPEG/WebP attachment                                            |
| POST   | `/api/render/animation` | the same look plus `motion`, `format` (`gif`/`webp`), `fps`, `seconds`, `maxLongEdge` → animated image |

```json
{
  "imageId": "uuid",
  "effect": {
    "mode": "straight", "area": "left", "axis": 0.4, "blending": 0.1, "angle": 18, "flare": 0.5, "sampleOffset": 0,
    "wave": 0.4, "length": 1, "fade": 0, "centerX": 0.5, "centerY": 0.5, "hue": 0, "saturation": 1,
    "tintAmount": 0, "tintStart": "#5b8cff", "tintEnd": "#ff4fd8", "glow": 0, "extraAxes": [{ "area": "right", "axis": 0.7 }]
  },
  "aspect": { "preset": "16:9", "customWidth": 1200, "customHeight": 628, "focusX": 0.5, "focusY": 0.5 },
  "mask": "data:image/png;base64,…",
  "layer": false,
  "motion": { "type": "flow", "amount": 0.35, "duration": 4, "loop": "pingpong", "easing": true },
  "time": 1.25,
  "maxLongEdge": 4096,
  "format": "png"
}
```

`motion`, `time`, `mask` and `layer` are optional, and so is every effect field after `sampleOffset` (older clients
keep working). `motion` may be `{ "type": "keyframes", …, "keyframes": { "from": { "axis": 0.2 }, "to": { "axis": 0.8 } } }`.
The mask is a PNG over the whole source image (any resolution, same proportions). All fields are validated with
`class-validator`, and unknown fields are rejected.

## Possible next steps

- Server-side MP4 export (ffmpeg) for frame-exact, higher-bitrate video
- Upload cleanup (TTL) or object storage (S3/GCS) in place of the local `uploads/` directory
- Saved looks per user on the server, rather than per browser
