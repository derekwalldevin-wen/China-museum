/**
 * Photo intake: downscale in the browser and re-encode, which also strips EXIF/GPS.
 */
import { MAX_EDGE, MAX_SOURCE_BYTES, THUMB_EDGE, newId, sha256Hex, type PhotoBlobs, type VisitorPhotoMeta } from './core';

export interface IngestedPhoto { meta: VisitorPhotoMeta; blobs: PhotoBlobs }

export function describeRejection(file: File): string | null {
  if (!file.type.startsWith('image/')) return `${file.name} 不是图片文件`;
  if (file.size > MAX_SOURCE_BYTES) return `${file.name} 超过 ${Math.round(MAX_SOURCE_BYTES / 1024 / 1024)} MB，请先压缩`;
  return null;
}

async function encode(bitmap: ImageBitmap, edge: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(width, height)
    : Object.assign(document.createElement('canvas'), { width, height });
  const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!context) throw new Error('无法创建绘图上下文');
  context.drawImage(bitmap, 0, 0, width, height);
  if (canvas instanceof OffscreenCanvas) return { blob: await canvas.convertToBlob({ type: 'image/jpeg', quality }), width, height };
  const blob = await new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(result => result ? resolve(result) : reject(new Error('图片编码失败')), 'image/jpeg', quality);
  });
  return { blob, width, height };
}

export async function ingestImageFile(file: File): Promise<IngestedPhoto> {
  const rejection = describeRejection(file);
  if (rejection) throw new Error(rejection);
  const bitmap = await createImageBitmap(file);
  try {
    const full = await encode(bitmap, MAX_EDGE, 0.82);
    const thumb = await encode(bitmap, THUMB_EDGE, 0.7);
    const bytes = new Uint8Array(await full.blob.arrayBuffer());
    const meta: VisitorPhotoMeta = {
      id: newId(),
      sourceName: file.name,
      mime: 'image/jpeg',
      bytes: bytes.length,
      width: full.width,
      height: full.height,
      sha256: await sha256Hex(bytes),
      thumbBytes: thumb.blob.size,
      exifStripped: true,
    };
    return { meta, blobs: { full: full.blob, thumb: thumb.blob } };
  } finally {
    bitmap.close();
  }
}
