'use client';

import { useParams } from 'next/navigation';
import PlacePageContent from '@/components/public/PlacePageContent';
import PublicShell from '@/components/public/PublicShell';

export default function ExploreDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';

  return (
    <PublicShell>
      <PlacePageContent placeSlug={slug} />
    </PublicShell>
  );
}
