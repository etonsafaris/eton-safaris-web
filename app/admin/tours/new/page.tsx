export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import TourPackageForm from '@/components/admin/TourPackageForm';

export default function NewTourPage() {
  return <TourPackageForm />;
}
