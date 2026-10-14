import { preload } from 'react-dom';
import { resolvePublicCmsImage } from '@/lib/public-image';
import { heroImageSrc } from '@/lib/responsive-image';

/** Start the saved hero download with the document, before the page body is painted. */
export function preloadPublicHero(src?: string | null) {
  const saved = resolvePublicCmsImage(src);
  if (!saved) return;
  const href = heroImageSrc(saved, 58);
  if (!href || href.startsWith('/images/')) return;
  preload(href, { as: 'image', fetchPriority: 'high' });
}
