import { join } from 'node:path';

export const config = {
  port: Number(process.env.PORT ?? 3300),
  uploadDir: process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'),
  /** Largest accepted upload, in bytes. */
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 40) * 1024 * 1024,
  /** Longest edge of a server render. */
  maxRenderEdge: Number(process.env.MAX_RENDER_EDGE ?? 4096),
  /** Built Vue app to serve in production (optional). */
  webDist: process.env.WEB_DIST ?? join(__dirname, '..', '..', 'web', 'dist'),
  corsOrigin: process.env.CORS_ORIGIN ?? true,
  /** Hugging Face model used to find the subject of a photo. */
  subjectModel: process.env.SUBJECT_MODEL ?? 'onnx-community/BiRefNet_lite-ONNX',
  /** Where the downloaded subject model is kept between restarts. */
  subjectModelCache: process.env.SUBJECT_MODEL_CACHE ?? join(process.cwd(), '.model-cache'),
};
