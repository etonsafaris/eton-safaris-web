import { SITE, SITE_LOGO } from '@/lib/collections';

export default function BrandLogo({
  size = 64,
  light = false,
  admin = false,
  compact = false,
}: {
  size?: number;
  light?: boolean;
  admin?: boolean;
  compact?: boolean;
}) {
  const imageSize = compact ? Math.max(size, 44) : size;

  return (
    <div className="flex items-center gap-2">
      <img
        src={SITE_LOGO}
        alt={SITE.name}
        width={imageSize}
        height={imageSize}
        decoding="async"
        fetchPriority="high"
        style={{ height: imageSize, width: 'auto' }}
        className={light ? 'rounded-md bg-white object-contain p-0.5' : 'object-contain'}
      />
      {admin ? (
        <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${light ? 'text-white/80' : 'text-sage'}`}>
          Admin Panel
        </p>
      ) : null}
    </div>
  );
}
