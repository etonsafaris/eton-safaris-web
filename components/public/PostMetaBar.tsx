import { Calendar, MapPin } from 'lucide-react';

export function formatPublishedDate(value?: string): string {
  if (!value) return '—';
  const trimmed = value.trim();
  if (!trimmed || /^(null|undefined|—|-|n\/a|none)$/i.test(trimmed)) return '—';
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    // Keep already-human stamps such as "August 15, 2026".
    if (/\d{4}/.test(trimmed)) return trimmed;
    return '—';
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
            <span className="text-gray-600">{item.value?.trim() || '—'}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
