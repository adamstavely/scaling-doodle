import type { AspectSetting, EffectParams, MotionParams } from '@energy-studio/core';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

export interface UploadedImage {
  id: string;
  width: number;
  height: number;
  format: string;
}

async function failure(res: Response): Promise<Error> {
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    message = Array.isArray(body.message) ? body.message.join(', ') : body.message ?? message;
  } catch {
    /* not JSON */
  }
  return new Error(message);
}

export async function uploadImage(file: Blob, name = 'image'): Promise<UploadedImage> {
  const form = new FormData();
  form.append('image', file, name);
  const res = await fetch(`${BASE}/images`, { method: 'POST', body: form });
  if (!res.ok) throw await failure(res);
  return res.json();
}

export interface RenderRequest {
  imageId: string;
  effect: EffectParams;
  aspect: AspectSetting;
  motion?: MotionParams;
  time?: number;
  maxLongEdge?: number;
  format?: 'png' | 'jpeg' | 'webp';
}

export async function renderImage(req: RenderRequest): Promise<Blob> {
  const res = await fetch(`${BASE}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw await failure(res);
  return res.blob();
}
