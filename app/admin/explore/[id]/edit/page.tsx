'use client';

import { useParams } from 'next/navigation';
import ExplorePlaceForm from '@/components/admin/ExplorePlaceForm';

export default function EditExplorePlacePage() {
  const params = useParams<{ id: string }>();
  const placeId = params?.id || '';

  return <ExplorePlaceForm placeId={placeId} />;
}
