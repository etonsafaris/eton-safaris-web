import { SITE_LOGO } from '@/lib/collections';

export default function AdminLogoLoader({
  label = 'Loading',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`} role="status" aria-live="polite">
      <div className="relative h-[92px] w-[92px]">
        <div
          className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#00A651]/15 border-t-[#00A651] border-r-[#00A651]/40"
          aria-hidden
        />
        <div className="absolute inset-[8px] flex items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_0_0_3px_#fff]">
          <img src={SITE_LOGO} alt="" className="h-[72%] w-[72%] object-contain" />
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
