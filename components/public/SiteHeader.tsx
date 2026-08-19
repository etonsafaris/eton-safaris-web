'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import { destinationPublicPath } from '@/lib/cms-routes';

function Flag({ iso, name, large }: { iso: string; name: string; large?: boolean }) {
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

export default function SiteHeader() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const homeActive = pathname === '/';

  return (
    <header className="site-header">
      <Link href="/" className="site-header-logo shrink-0">
        <BrandLogo size={72} />
      </Link>

      <nav className="hidden items-center lg:flex">
        <Link href="/" className={navClass(homeActive)}>
          Home
        </Link>
        {NAV_COUNTRIES.map((country) => {
          const href = destinationPublicPath(country.slug);
          const countryAlias = `/${country.slug}-safaris`;
          const active =
            pathname === href ||
            pathname.startsWith(`${href}/`) ||
            pathname === countryAlias ||
            pathname.startsWith(`${countryAlias}/`) ||
            pathname === `/country/${country.slug}` ||
            pathname === `/${country.slug}`;
          return (
            <Link key={country.slug} href={href} className={navClass(active)}>
              <Flag iso={country.iso} name={country.name} /> {country.name}
            </Link>
          );
        })}
        <div className="site-nav-item">
          Other Destinations
          <div className="site-nav-dropdown">
            {OTHER_DESTINATIONS.map((destination) => (
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
        <Link href="/safari-updates" className={navClass(pathname.startsWith('/safari-updates'))}>
          Safari Updates
        </Link>
        <Link href="/community-support" className={navClass(pathname.startsWith('/community'))}>
          Community
        </Link>
        <Link href="/contact-us" className={navClass(pathname.startsWith('/contact'))}>
          Talk to Us
        </Link>
      </nav>

      <div className="flex items-center gap-2 lg:hidden">
        <Link href="/contact-us" className="px-2 py-2 text-base text-[#222]">
          Talk to Us
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
          {NAV_COUNTRIES.map((country) => (
            <Link
              key={country.slug}
              href={destinationPublicPath(country.slug)}
              className="flex items-center gap-2 py-1"
              onClick={() => setOpen(false)}
            >
              <Flag iso={country.iso} name={country.name} /> {country.name}
            </Link>
          ))}
          <p className="pt-2 text-base">Other Destinations</p>
          {OTHER_DESTINATIONS.map((destination) => (
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
            Safari Updates
          </Link>
          <Link href="/community-support" className="block py-1" onClick={() => setOpen(false)}>
            Community
          </Link>
          <Link href="/contact-us" className="block py-1" onClick={() => setOpen(false)}>
            Talk to Us
          </Link>
        </div>
      )}
    </header>
  );
}
