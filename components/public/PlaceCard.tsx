'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { formatPublishedDateValue, formatPublishedStamp } from '@/lib/public-date';
import { stripPublicMoney } from '@/lib/public-money';
import ResponsiveImage from '@/components/public/ResponsiveImage';
import type { RecordRow } from '@/lib/types';

function cardStamp(date?: string, record?: RecordRow) {
  const candidates = [
    date,
    record?.published_at,
    record?.published_date,
    record?.publish_date,
    record?.created_at,
    record?.created_date,
    record?.updated_at,
    record?.updated_date,
  ];
  for (const value of candidates) {
    const stamp = formatPublishedStamp(value);
    if (stamp) return stamp;
  }
  const match = /^(\d{13})(?:-|$)/.exec(String(record?.id ?? ''));
  if (match) return formatPublishedStamp(new Date(Number(match[1])));
  const pretty = formatPublishedDateValue(date);
  return pretty ? `Published ${pretty}` : '';
}

export default function PlaceCard({
  href,
  image,
  title,
  location,
  description,
  date,
  record,
  cta = 'Read More',
}: {
  href: string;
  image?: string;
  title: string;
  location?: string;
  description?: string;
  date?: string;
  record?: RecordRow;
  cta?: string;
}) {
  const hasImage = useMemo(() => Boolean(image?.trim()), [image]);

  const stamp = cardStamp(date, record);
  const copy = typeof description === 'string' ? stripPublicMoney(description) : '';
  const to = typeof href === 'string' && href.trim() ? href : '/';

  return (
    <Link href={to} className="group flex h-full flex-col overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {hasImage ? (
          <ResponsiveImage
            src={image!}
            alt={title || ''}
            variant="card"
            width={640}
            height={480}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            useErrorFallback
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {stamp ? (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#00A651]">{stamp}</p>
        ) : null}
        <h2 className="text-[15px] font-bold leading-snug text-[#111]">{title}</h2>
        {location ? (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#00A651]">{location}</p>
        ) : null}
        {copy ? <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#555]">{copy}</p> : null}
        <div className="mt-auto pt-4">
          <span className="dav-cta">{cta}</span>
        </div>
      </div>
    </Link>
  );
}
