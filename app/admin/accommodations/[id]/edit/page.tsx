'use client';

import { useParams } from 'next/navigation';
import AccommodationForm from '@/components/admin/AccommodationForm';

export default function EditAccommodationPage() {
  const params = useParams<{ id: string }>();
  const accommodationId = params?.id || '';

  return <AccommodationForm accommodationId={accommodationId} />;
}
