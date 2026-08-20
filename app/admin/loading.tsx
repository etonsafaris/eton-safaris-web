import AdminLogoLoader from '@/components/admin/AdminLogoLoader';

export default function AdminLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <AdminLogoLoader label="Loading module" />
    </div>
  );
}
