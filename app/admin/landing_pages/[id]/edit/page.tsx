'use client';

import { useParams } from 'next/navigation';
import LandingPageForm from '@/components/admin/LandingPageForm';

export default function EditLandingPagePage() {
  const params = useParams<{ id: string }>();
  return <LandingPageForm landingId={params?.id || ''} />;
}
