import PublicShellServer from '@/components/public/PublicShellServer';
import { PublicGallery } from '@/components/public/PublicGallery';
import { fetchGalleryPhotos } from '@/lib/data-server';
import type { RecordRow } from '@/lib/types';
import type { Metadata } from 'next';

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Photos from Eton Safaris trips, guests, guides, and the road across Africa.',
  alternates: { canonical: 'https://www.etonsafaris.com/gallery' },
};

function shufflePhotos(photos: RecordRow[]): RecordRow[] {
  const copy = [...photos];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

export default async function GalleryPage() {
  const photos = shufflePhotos(await fetchGalleryPhotos().catch(() => []));

  return (
    <PublicShellServer>
      <PublicGallery photos={photos} />
    </PublicShellServer>
  );
}
