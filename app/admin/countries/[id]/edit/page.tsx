'use client';

import { useParams } from 'next/navigation';
import CountryForm from '@/components/admin/CountryForm';

export default function EditCountryPage() {
  const params = useParams<{ id: string }>();
  const countryId = params?.id || '';

  return <CountryForm countryId={countryId} />;
}
