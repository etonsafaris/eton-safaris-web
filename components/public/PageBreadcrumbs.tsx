'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

function labelFor(segment: string, fallback: string) {
  return LABELS[segment] || fallback.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PageBreadcrumbs({
  currentTitle,
  tone = 'light',
}: {
  currentTitle: string;
  tone?: 'light' | 'forest';
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

  const forest = tone === 'forest';
  const list = (
    <ol
      className={`flex min-w-0 flex-wrap items-center gap-1 text-[13px] ${
        forest ? 'text-white/70' : 'text-[#555]'
      }`}
    >
      <li>
        <Link href="/" className={forest ? 'hover:text-white' : 'hover:text-moss'}>
          Home
        </Link>
      </li>
      {crumbs.map((crumb) => (
        <li key={crumb.href} className="flex items-center gap-1">
          <span className={forest ? 'text-white/35' : 'text-[#bbb]'} aria-hidden>
            /
          </span>
          {crumb.last ? (
            <span className={forest ? 'font-medium text-white' : 'font-medium text-[#222]'} aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link href={crumb.href} className={forest ? 'hover:text-white' : 'hover:text-moss'}>
              {crumb.label}
            </Link>
          )}
        </li>
      ))}
    </ol>
  );

  if (forest) {
    return <nav aria-label="Breadcrumb">{list}</nav>;
  }

  return (
    <nav aria-label="Breadcrumb" className="border-b border-[#ececec] bg-white">
      <div className="mx-auto max-w-[1200px] px-4 py-2.5 md:px-6">{list}</div>
    </nav>
  );
}
