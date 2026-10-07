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
}: {
  title: string;
  items: RelatedSidebarItem[];
  countryName?: string;
  showExpert?: boolean;
}) {
  const safeItems = (items ?? []).filter((item) => item?.href);

  return (
    <aside className="lg:col-span-1 lg:self-start">
      {safeItems.length > 0 ? (
        <div className="rounded-[20px] bg-[#edf2f2] p-2.5">
          <div className="p-2.5">
            <h2 className="mb-0 text-[28px] font-normal italic leading-[1.2] text-[#6aa441]">{title}</h2>
          </div>
          <ul className="list-none px-5 text-[#343434]">
            {safeItems.map((item) => (
              <li key={item?.href} className="border-b border-[#d7e0e0] py-3 last:border-b-0">
                <Link href={item?.href ?? '/'} className="group flex items-start gap-3">
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
