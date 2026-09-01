import AdminLogoLoader from '@/components/admin/AdminLogoLoader';

export default function PublicPageLoader({
  label = 'Loading page',
  className = 'min-h-[60vh]',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center bg-white ${className}`} role="status" aria-live="polite">
      <AdminLogoLoader label={label} />
    </div>
  );
}
