const DEFAULT_WIDTHS = [480, 768, 1080, 1440];

function withSearchParams(src: string, params: Record<string, string>) {
  try {
    const url = new URL(src);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  } catch {
    return src;
  }
}

export function sizedImageUrl(src: string, width: number, quality = 70): string {
  if (!src) return src;
  if (src.includes('images.unsplash.com')) {
    return withSearchParams(src, {
      auto: 'format',
      fit: 'crop',
      w: String(width),
      q: String(quality),
      fm: 'webp',
    });
  }
  if (src.includes('res.cloudinary.com') && src.includes('/upload/') && !src.includes('/w_')) {
    return src.replace('/upload/', `/upload/f_auto,q_auto:eco,c_fill,w_${width}/`);
  }
  return src;
}

export function imageSrcSet(src: string, widths: number[] = DEFAULT_WIDTHS): string {
  if (!src) return '';
  if (!src.includes('images.unsplash.com') && !src.includes('res.cloudinary.com')) return '';
  return widths.map((width) => `${sizedImageUrl(src, width)} ${width}w`).join(', ');
}

export function heroImageSrc(src: string) {
  return sizedImageUrl(src, 1080, 72);
}

export function cardImageSrc(src: string) {
  return sizedImageUrl(src, 640, 68);
}
