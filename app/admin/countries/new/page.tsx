export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import CountryForm from '@/components/admin/CountryForm';

export default function NewCountryPage() {
  return <CountryForm />;
}
