'use client';

import { useEffect, useState } from 'react';
import { ADMIN_DEFAULT_CARD_IMAGE, resolveAdminCardImageSrc } from '@/lib/admin-image';

type AdminSafeImageProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
};

/** Admin list/card thumbnails: validated `src`, default asset, and `onError` recovery. */
export default function AdminSafeImage({
  src,
  alt = '',
  className = 'h-full w-full object-cover',
  loading = 'lazy',
}: AdminSafeImageProps) {
  const [displaySrc, setDisplaySrc] = useState(() => resolveAdminCardImageSrc(src));

  useEffect(() => {
    setDisplaySrc(resolveAdminCardImageSrc(src));
  }, [src]);

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => {
        setDisplaySrc((current) =>
          current === ADMIN_DEFAULT_CARD_IMAGE ? current : ADMIN_DEFAULT_CARD_IMAGE
        );
      }}
    />
  );
}
