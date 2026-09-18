'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { usePublicDestinations } from '@/components/public/usePublicDestinations';
import { PUBLIC_SITE_LABELS } from '@/lib/collections';
import { destinationPublicPath } from '@/lib/cms-routes';
import type { PublicDestination } from '@/lib/public-destinations';

function Flag({ iso, name, large }: { iso: string; name: string; large?: boolean }) {
  if (!iso) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={name}
      className={large ? 'h-5 w-7 rounded-sm object-cover' : 'h-3.5 w-5 rounded-sm object-cover'}
      loading="lazy"
    />
  );
}

function navClass(active: boolean) {
  return `site-nav-item${active ? ' is-active' : ''}`;
}

function destinationActive(pathname: string, destination: PublicDestination) {
  const href = destinationPublicPath(destination.slug);
  const countryAlias = `/${destination.slug}-safaris`;
  return (
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    pathname === countryAlias ||
    pathname.startsWith(`${countryAlias}/`) ||
    pathname === `/country/${destination.slug}` ||
    pathname === `/${destination.slug}`
  );
}

export default function SiteHeader() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const { primary, more } = usePublicDestinations();
  const homeActive = pathname === '/';

  return (
    <header className="site-header relative">
      <Link href="/" className="site-header-logo shrink-0">
        <BrandLogo size={72} />
      </Link>

      <nav className="hidden items-center lg:flex">
        <Link href="/" className={navClass(homeActive)}>
          Home
        </Link>
        {primary.map((country) => {
          const href = destinationPublicPath(country.slug);
          return (
            <Link  key={country.slug} href={href} className={navClass(destinationActive(pathname, country))}>
              <Flag iso={country.iso} name={country.name} /> {country.name}
            </Link>
          );
        })}
        {more.length > 0 ? (
          <div className="site-nav-item">
            {PUBLIC_SITE_LABELS.moreGetaways}
            <div className="site-nav-dropdown">
              {more.map((destination) => (
                <Link
                  key={destination.slug}
                  href={destinationPublicPath(destination.slug)}
                  className="site-nav-dropdown-item"
                >
                  <Flag iso={destination.iso} name={destination.name} large /> {destination.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        <Link href="/safari-updates" className={navClass(pathname.startsWith('/safari-updates'))}>
          {PUBLIC_SITE_LABELS.blogPosts}
        </Link>
        <Link  href="/community-support" className={navClass(pathname.startsWith('/community'))}>
          Community
        </Link>
        <Link  href="/contact-us" className={navClass(pathname.startsWith('/contact'))}>
          {PUBLIC_SITE_LABELS.getInTouch}
        </Link>
      </nav>

      <div className="flex items-center gap-2 lg:hidden">
        <Link href="/contact-us" className="px-2 py-2 text-base text-[#222]">
          {PUBLIC_SITE_LABELS.getInTouch}
        </Link>
        <button type="button" className="rounded-md p-2 text-[#222]" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full space-y-1 border-t border-gray-100 bg-white px-4 py-4 text-base shadow-md lg:hidden">
          <Link href="/" className="block py-2" onClick={() => setOpen(false)}>
            Home
          </Link>
          {primary.map((country) => (
            <Link
              key={country.slug}
              href={destinationPublicPath(country.slug)}
              className="flex items-center gap-2 py-1"
              onClick={() => setOpen(false)}
            >
              <Flag iso={country.iso} name={country.name} /> {country.name}
            </Link>
          ))}
          {more.length > 0 ? <p className="pt-2 text-base">{PUBLIC_SITE_LABELS.moreGetaways}</p> : null}
          {more.map((destination) => (
            <Link
              key={destination.slug}
              href={destinationPublicPath(destination.slug)}
              className="flex items-center gap-2 py-1 pl-2"
              onClick={() => setOpen(false)}
            >
              <Flag iso={destination.iso} name={destination.name} /> {destination.name}
            </Link>
          ))}
          <Link href="/safari-updates" className="block py-1" onClick={() => setOpen(false)}>
            {PUBLIC_SITE_LABELS.blogPosts}
          </Link>
          <Link href="/community-support" className="block py-1" onClick={() => setOpen(false)}>
            Community
          </Link>
          <Link href="/contact-us" className="block py-1" onClick={() => setOpen(false)}>
            {PUBLIC_SITE_LABELS.getInTouch}
          </Link>
        </div>
      )}
    </header>
  );
}
