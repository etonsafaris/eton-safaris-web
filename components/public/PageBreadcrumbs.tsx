'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CalendarRange, MapPin } from 'lucide-react';

const LABELS: Record<string, string> = {
  destinations: 'Destinations',
  tours: 'Safari Tours',
  parks: 'National Parks',
  explore: 'Explore',
  accommodations: 'Accommodations',
  'safari-updates': 'Safari Updates',
  community: 'Community',
  contact: 'Contact',
  'request-a-quote': 'Request a Quote',
  agents: 'Agents',
  register: 'Register',
};

export type BreadcrumbMetaItem = {
  label: string;
  value?: string;
};

function labelFor(segment: string, fallback: string) {
  return LABELS[segment] || fallback.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function MetaIcon({ label }: { label: string }) {
  if (/time|visit/i.test(label)) return <CalendarRange className="h-3.5 w-3.5 text-moss" />;
  if (/published|date/i.test(label)) return <Calendar className="h-3.5 w-3.5 text-moss" />;
  return <MapPin className="h-3.5 w-3.5 text-moss" />;
}

export default function PageBreadcrumbs({
  currentTitle,
  items,
}: {
  currentTitle: string;
  items?: BreadcrumbMetaItem[];
}) {
  const pathname = usePathname() || '/';
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  let href = '';
  const crumbs = parts.map((part, index) => {
    href += `/${part}`;
    const last = index === parts.length - 1;
    return {
      href,
      label: last ? currentTitle : labelFor(part, part),
      last,
    };
  });

  const meta = (items || []).filter((item) => String(item.value || '').trim());

  return (
    <nav aria-label="Breadcrumb" className="border-b border-[#ececec] bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-2.5 md:px-6">
        <ol className="flex min-w-0 flex-wrap items-center gap-1 text-[13px] text-[#555]">
          <li>
            <Link href="/" className="hover:text-moss">
              Home
            </Link>
          </li>
          {crumbs.map((crumb) => (
            <li key={crumb.href} className="flex items-center gap-1">
              <span className="text-[#bbb]" aria-hidden>
                /
              </span>
              {crumb.last ? (
                <span className="font-medium text-[#222]" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-moss">
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
        {meta.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-[#555]">
            {meta.map((item) => (
              <span key={item.label} className="inline-flex min-w-0 items-center gap-1.5">
                <MetaIcon label={item.label} />
                <strong className="shrink-0 font-semibold text-[#374151]">{item.label}:</strong>
                <span className="min-w-0 text-[#222]">{item.value}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
