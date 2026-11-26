import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import sharp from 'sharp';
import { config } from '../config';

// Transformers.js is an ES module; a plain import() keeps TypeScript's CommonJS output from turning it into require().
const importEsm = new Function('m', 'return import(m)') as (m: string) => Promise<typeof import('@huggingface/transformers')>;

type Segmenter = {
  model: (inputs: Record<string, unknown>) => Promise<{ output_image: { sigmoid(): { mul(n: number): { to(t: string): unknown } } }[] }>;
  processor: (image: unknown) => Promise<{ pixel_values: unknown }>;
  RawImage: typeof import('@huggingface/transformers').RawImage;
};

/**
 * Finds the main subject of a photo with BiRefNet lite (MIT), run by Transformers.js on the server. The model
 * (about 220 MB) downloads from Hugging Face on first use and is cached in SUBJECT_MODEL_CACHE.
 */
@Injectable()
export class SubjectService {
  private readonly log = new Logger(SubjectService.name);
  private loading: Promise<Segmenter> | null = null;

  private load(): Promise<Segmenter> {
    this.loading ??= (async () => {
      const t = await importEsm('@huggingface/transformers');
      t.env.cacheDir = config.subjectModelCache;
      this.log.log(`Loading subject model ${config.subjectModel}…`);
      const model = await t.AutoModel.from_pretrained(config.subjectModel, { dtype: 'fp32' });
      const processor = await t.AutoProcessor.from_pretrained(config.subjectModel);
      this.log.log('Subject model ready');
      return { model: model as unknown as Segmenter['model'], processor: processor as unknown as Segmenter['processor'], RawImage: t.RawImage };
    })().catch((e) => {
      this.loading = null;
      this.log.error(`Subject model failed to load: ${e instanceof Error ? e.message : e}`);
      throw new ServiceUnavailableException('Subject detection is not available right now');
    });
    return this.loading;
  }

  /** A greyscale PNG the size of the (orientated) image: white where the subject is. */
  async detect(path: string): Promise<Buffer> {
    const seg = await this.load();
    const { data, info } = await sharp(path)
      .autoOrient()
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const image = new seg.RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);
    const { pixel_values } = await seg.processor(image);
    const { output_image } = await seg.model({ input_image: pixel_values });
    const matte = seg.RawImage.fromTensor(output_image[0].sigmoid().mul(255).to('uint8') as never);
    const resized = await matte.resize(info.width, info.height);
    return sharp(Buffer.from(resized.data), { raw: { width: resized.width, height: resized.height, channels: resized.channels as 1 } })
      .png()
      .toBuffer();
  }
}
