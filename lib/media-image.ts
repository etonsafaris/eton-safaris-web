export const MEDIA_WIDTHS = [160, 320, 480, 640, 768, 1080, 1440] as const;

export function parseMediaWidth(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const requested = Number(raw);
  if (!Number.isFinite(requested) || requested < 32) return null;
  return MEDIA_WIDTHS.reduce((best, width) =>
    Math.abs(width - requested) < Math.abs(best - requested) ? width : best
  );
}

export function parseMediaQuality(raw: string | null | undefined, fallback = 72): number {
  const requested = Number(raw);
  if (!Number.isFinite(requested)) return fallback;
  return Math.min(82, Math.max(40, Math.round(requested)));
}

export function wantsMediaTransform(search: URLSearchParams): boolean {
  return Boolean(parseMediaWidth(search.get('w')) || /^(webp|avif)$/i.test(search.get('fm') || ''));
}

export async function transformMediaBytes(
  bytes: Buffer,
  mime: string,
  width: number | null,
  quality: number
): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!mime.startsWith('image/') || /gif|svg|xml/i.test(mime)) return null;
  const sharp = (await import('sharp')).default;
  let pipeline = sharp(bytes, { failOn: 'none' }).rotate();
  if (width) {
    pipeline = pipeline.resize(width, null, { fit: 'inside', withoutEnlargement: true });
  }
  const output = await pipeline.webp({ quality, effort: 4 }).toBuffer();
  return { bytes: output, mime: 'image/webp' };
}
