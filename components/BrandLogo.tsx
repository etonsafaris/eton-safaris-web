import { SITE, SITE_LOGO } from '@/lib/collections';

const LOGO_WEBP_SRCSET =
  '/eton-safaris-gorilla-96.webp 96w, /eton-safaris-gorilla-192.webp 192w, /eton-safaris-gorilla-384.webp 384w';

export function SiteLogoImage({
  size,
  className,
  priority = false,
  alt = SITE.name,
}: {
  size: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <picture>
      <source type="image/webp" srcSet={LOGO_WEBP_SRCSET} sizes={`${size}px`} />
      <img
        src={SITE_LOGO}
        alt={alt}
        width={size}
        height={size}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'low'}
        style={{ height: size, width: 'auto' }}
        className={className}
      />
    </picture>
  );
}

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
      <SiteLogoImage
        size={imageSize}
        priority
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
