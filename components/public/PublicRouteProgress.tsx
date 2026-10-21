'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isDirectFileHref } from '@/lib/document-href';
import { internalPathFromHref } from '@/lib/internal-link';

/**
 * Immediate top bar on internal clicks so navigation feels like a full-page WordPress load
 * instead of waiting silently for the App Router payload.
 */
export default function PublicRouteProgress() {
  const pathname = usePathname() || '/';
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || isDirectFileHref(href)) return;
      const internal = internalPathFromHref(href, { pageOrigin: window.location.origin });
      if (!internal) return;
      const nextPath = internal.split('?')[0]?.split('#')[0] || internal;
      if (nextPath === pathname) return;
      setPending(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  if (!pending) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] overflow-hidden bg-[#00A651]/20"
      role="progressbar"
      aria-label="Loading page"
    >
      <div className="h-full w-1/3 animate-[public-route-progress_0.8s_ease-in-out_infinite] bg-[#00A651]" />
      <style>{`@keyframes public-route-progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
    </div>
  );
}
