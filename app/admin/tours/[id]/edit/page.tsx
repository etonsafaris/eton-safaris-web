'use client';

import { useParams } from 'next/navigation';
import TourPackageForm from '@/components/admin/TourPackageForm';

export default function EditTourPage() {
  const params = useParams<{ id: string }>();
  const tourId = params?.id || '';

  return <TourPackageForm tourId={tourId} />;
}
