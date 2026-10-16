import { SITE_LOGO } from '@/lib/collections';

/** Original public loading mark — brand logo with a light spin ring. */
export default function PublicPageLoader({
  label = 'Loading',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-[50vh] flex-col items-center justify-center bg-white px-4 py-16 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative h-[92px] w-[92px]">
        <div
          className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#00A651]/15 border-t-[#00A651] border-r-[#00A651]/40"
          aria-hidden
        />
        <div className="absolute inset-[8px] flex items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_0_0_3px_#fff]">
          <img src={SITE_LOGO} alt="" className="h-[72%] w-[72%] object-contain" />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-[#4b5563]">{label}</p>
    </div>
  );
}
