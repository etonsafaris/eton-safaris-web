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
      <div className="relative h-[88px] w-[88px]">
        <div
          className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#00A651]/20 border-t-[#00A651]"
          aria-hidden
        />
        <div className="absolute inset-[10px] overflow-hidden rounded-full bg-white">
          <img src={SITE_LOGO} alt="" className="h-full w-full object-contain p-1" />
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
