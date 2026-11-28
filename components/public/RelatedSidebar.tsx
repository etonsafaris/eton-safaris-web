'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import SpeakToExpertCard from '@/components/public/SpeakToExpertCard';
import { publicImagePlaceholderArt, publicImageSrcOrFallback } from '@/lib/public-image';

export type RelatedSidebarItem = {
  href: string;
  image?: string | null;
  title: string;
  date?: string;
};

function SidebarThumb({ src, title }: { src?: string | null; title: string }) {
  const resolved = useMemo(() => (src ? publicImageSrcOrFallback(src) : ''), [src]);
  const [failed, setFailed] = useState(false);
  const displaySrc = failed ? publicImagePlaceholderArt() : resolved;

  if (!displaySrc) {
    return <div className="h-14 w-[72px] shrink-0 rounded bg-[#d7e0e0]" />;
  }

  const unoptimized = displaySrc.startsWith('/api/media/');

  return (
    <Image
      src={displaySrc}
      alt={title || ''}
      width={72}
      height={56}
      sizes="72px"
      unoptimized={unoptimized}
      className="h-14 w-[72px] shrink-0 rounded object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function RelatedSidebar({
  title,
  items,
  countryName = '',
  showExpert = true,
  alwaysShow = false,
  layout = 'stack',
}: {
  title: string;
  items: RelatedSidebarItem[];
  countryName?: string;
  showExpert?: boolean;
  alwaysShow?: boolean;
  layout?: 'stack' | 'rail';
}) {
  const safeItems = (items ?? []).filter((item) => item?.href);
  const showList = safeItems.length > 0 || alwaysShow;

  return (
    <aside className={layout === 'rail' ? 'mx-auto max-w-6xl' : 'lg:col-span-1 lg:self-start'}>
      {showList ? (
        <div className={layout === 'rail' ? '' : 'rounded-[20px] bg-[#edf2f2] p-2.5'}>
          <div className={layout === 'rail' ? 'mb-4' : 'p-2.5'}>
            <h2 className={layout === 'rail' ? 'font-serif text-2xl text-[#1c1915]' : 'mb-0 text-[28px] font-normal italic leading-[1.2] text-[#6aa441]'}>{title}</h2>
          </div>
          <ul className={layout === 'rail' ? 'grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'list-none px-5 text-[#343434]'}>
            {safeItems.map((item) => (
              <li key={item?.href} className={layout === 'rail' ? 'border border-[#d9d2c5] bg-white p-3' : 'border-b border-[#d7e0e0] py-3 last:border-b-0'}>
                <Link href={item?.href ?? '/'} prefetch className="group flex items-start gap-3">
                  <SidebarThumb src={item?.image} title={item?.title ?? ''} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base leading-6 text-black group-hover:text-[#6aa441]">
                      {item?.title ?? ''}
                    </span>
                    {item?.date && item.date !== '—' ? (
                      <span className="mt-1 block text-right font-serif text-sm italic text-[#aaaaaa]">
                        {item.date}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {showExpert ? (
        <div className={safeItems.length > 0 ? 'mt-6' : ''}>
          <SpeakToExpertCard variant="country" countryName={countryName} />
        </div>
      ) : null}
    </aside>
  );
}
