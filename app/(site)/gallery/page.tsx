import PublicShellServer from '@/components/public/PublicShellServer';
import { FastCoverImage } from '@/components/public/FastCoverImage';
import { fetchGalleryPhotos } from '@/lib/data-server';
import { pickString } from '@/lib/data';
import type { Metadata } from 'next';

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Photos from Eton Safaris trips, guests, guides, and the road across Africa.',
  alternates: { canonical: 'https://www.etonsafaris.com/gallery' },
};

export default async function GalleryPage() {
  const photos = await fetchGalleryPhotos().catch(() => []);
  const hero = photos[0] ? pickString(photos[0], ['image_url']) : '';

  return (
    <PublicShellServer>
      <section className="relative h-[420px] overflow-hidden bg-[#e4efe6] md:h-[520px]">
        {hero ? <FastCoverImage src={hero} alt="" /> : null}
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/90">Safari moments from the road</p>
          <h1 className="mt-3 font-serif text-5xl font-bold md:text-6xl">Our Gallery</h1>
        </div>
      </section>
      <section className="public-gallery">
        {photos.length ? (
          <div className="public-gallery-grid">
            {photos.map((photo, index) => {
              const src = pickString(photo, ['image_url']);
              const title = pickString(photo, ['title', 'alt_text']);
              const caption = pickString(photo, ['caption']) || title;
              return (
                <figure key={String(photo.id ?? index)} className="public-gallery-item">
                  <img src={src} alt={title || caption || 'Safari photo'} loading="lazy" />
                  {caption ? <figcaption className="public-gallery-caption">{caption}</figcaption> : null}
                </figure>
              );
            })}
          </div>
        ) : (
          <p className="px-6 py-16 text-center text-gray-500">Photos added in the admin Gallery will appear here.</p>
        )}
      </section>
    </PublicShellServer>
  );
}
