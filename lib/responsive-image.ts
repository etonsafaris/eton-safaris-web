const DEFAULT_WIDTHS = [480, 768, 1080, 1440];
export const CARD_IMAGE_WIDTHS = [320, 480, 640, 768];
export const HERO_IMAGE_WIDTHS = [640, 768, 1080, 1440];
export const THUMB_IMAGE_WIDTHS = [160, 320];

function withSearchParams(src: string, params: Record<string, string>) {
  try {
    const url = new URL(src, 'https://etonsafaris.local');
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    if (src.startsWith('/') && !src.startsWith('//')) return `${url.pathname}${url.search}`;
    return src.startsWith('http') || src.startsWith('//') ? url.toString() : `${url.pathname}${url.search}`;
  } catch {
    return src;
  }
}

function isCmsMediaPath(src: string) {
  return /\/api\/media\/|\/cms-media\//i.test(src);
}

export function canBuildSrcSet(src: string) {
  if (!src) return false;
  return (
    src.includes('images.unsplash.com') ||
    src.includes('res.cloudinary.com') ||
    /^\/heroes\//.test(src) ||
    isCmsMediaPath(src)
  );
}

export function sizedImageUrl(src: string, width: number, quality = 70): string {
  if (!src) return src;
  if (/^\/heroes\/.*\.(?:png|jpe?g|webp)$/i.test(src)) {
    return src.replace(/\.(?:png|jpe?g|webp)$/i, `-${width}.webp`);
  }
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
  if (isCmsMediaPath(src)) {
    return withSearchParams(src, {
      w: String(width),
      q: String(quality),
      fm: 'webp',
    });
  }
  return src;
}

export function imageSrcSet(src: string, widths: number[] = DEFAULT_WIDTHS): string {
  if (!canBuildSrcSet(src)) return '';
  return widths.map((width) => `${sizedImageUrl(src, width)} ${width}w`).join(', ');
}

export function heroImageSrc(src: string) {
  return sizedImageUrl(src, 1080, 72);
}

export function cardImageSrc(src: string) {
  return sizedImageUrl(src, 640, 68);
}

export function thumbImageSrc(src: string) {
  return sizedImageUrl(src, 160, 65);
}

export function contentImageSrc(src: string) {
  return sizedImageUrl(src, 1080, 72);
}
