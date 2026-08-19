'use client';

import { useParams } from 'next/navigation';
import NationalParkForm from '@/components/admin/NationalParkForm';

export default function EditNationalParkPage() {
  const params = useParams<{ id: string }>();
  const parkId = params?.id || '';

  return <NationalParkForm parkId={parkId} />;
}
