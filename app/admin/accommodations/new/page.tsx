export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import AccommodationForm from '@/components/admin/AccommodationForm';

export default function NewAccommodationPage() {
  return <AccommodationForm />;
}
