'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { usePublicDestinations } from '@/components/public/usePublicDestinations';
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

  const countries = [...primary, ...more];

  return (
    <header className="site-header">
      <div className="site-header-utility">
        <p>Safaris planned in Uganda, Kenya, Tanzania, and Rwanda</p>
        <Link href="/request-a-quote" className="site-header-plan">
          Plan a route
        </Link>
      </div>

      <div className="site-header-brandrow">
        <Link href="/" className="site-header-logo shrink-0">
          <BrandLogo size={52} />
        </Link>

        <nav className="hidden items-center lg:flex" aria-label="Primary">
          <Link href="/" prefetch className={navClass(homeActive)}>
            Home
          </Link>
          <Link href="/tours" prefetch className={navClass(pathname.startsWith('/tours'))}>
            Routes
          </Link>
          <Link href="/safari-updates" prefetch className={navClass(pathname.startsWith('/safari-updates'))}>
            Field notes
          </Link>
          <Link href="/gallery" prefetch className={navClass(pathname.startsWith('/gallery'))}>
            Gallery
          </Link>
          <Link href="/community" prefetch className={navClass(pathname.startsWith('/community'))}>
            Community
          </Link>
          <Link href="/contact-us" prefetch className={navClass(pathname.startsWith('/contact'))}>
            Desk
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-[#1c1915] lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <nav className="site-header-rail" aria-label="Destinations">
        {countries.map((destination) => (
          <Link
            key={destination.slug}
            href={destinationPublicPath(destination.slug)}
            prefetch
            className={`site-rail-link${destinationActive(pathname, destination) ? ' is-active' : ''}`}
          >
            <Flag iso={destination.iso} name={destination.name} />
            {destination.name}
          </Link>
        ))}
      </nav>

      {open ? (
        <div className="space-y-1 border-t border-[#d9d2c5] bg-[#f6f1e8] px-5 py-4 text-base lg:hidden">
          <Link href="/" className="block py-2" onClick={() => setOpen(false)}>
            Home
          </Link>
          <Link href="/tours" className="block py-2" onClick={() => setOpen(false)}>
            Routes
          </Link>
          <Link href="/safari-updates" className="block py-2" onClick={() => setOpen(false)}>
            Field notes
          </Link>
          <Link href="/gallery" className="block py-2" onClick={() => setOpen(false)}>
            Gallery
          </Link>
          <Link href="/community" className="block py-2" onClick={() => setOpen(false)}>
            Community
          </Link>
          <Link href="/contact-us" className="block py-2" onClick={() => setOpen(false)}>
            Desk
          </Link>
          <Link href="/request-a-quote" className="block py-2" onClick={() => setOpen(false)}>
            Plan a route
          </Link>
        </div>
      ) : null}
    </header>
  );
}
