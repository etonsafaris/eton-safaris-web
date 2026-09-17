'use client';

import { Calendar, MapPin } from 'lucide-react';
import { formatPublishedDateValue } from '@/lib/public-date';

export function formatPublishedDate(value?: string): string {
  return formatPublishedDateValue(value) || '—';
}

export type MetaItem = {
  label: string;
  value?: string;
};

type PostMetaBarProps = {
  country?: string;
  location?: string;
  published?: string;
  showLocation?: boolean;
  items?: MetaItem[];
};

export default function PostMetaBar({
  country,
  location,
  published,
  showLocation = true,
  items,
}: PostMetaBarProps) {
  const resolved: MetaItem[] =
    items && items.length > 0
      ? items.map((item) =>
          item.label === 'Published'
            ? { ...item, value: formatPublishedDate(item.value) }
            : item
        )
      : [
          { label: 'Country', value: country },
          ...(showLocation ? [{ label: 'Location', value: location }] : []),
          { label: 'Published', value: formatPublishedDate(published) },
        ];

  return (
    <div className="bg-[#ececec]">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3 text-sm">
        {resolved.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            {item.label === 'Published' || /time|visit/i.test(item.label) ? (
              <Calendar className="h-4 w-4 text-moss" />
            ) : (
              <MapPin className="h-4 w-4 text-moss" />
            )}
            <strong className="text-gray-700">{item.label}:</strong>
            <span className={item.label === 'Published' ? 'font-semibold text-[#00A651]' : 'text-gray-600'}>
              {item.value?.trim() || '—'}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
