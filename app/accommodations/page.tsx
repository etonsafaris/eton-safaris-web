import AccommodationsPageClient from '@/components/public/AccommodationsPageClient';

export const revalidate = 60;

export default function AccommodationsPage() {
  return <AccommodationsPageClient initialRows={[]} initialTotal={0} />;
}
