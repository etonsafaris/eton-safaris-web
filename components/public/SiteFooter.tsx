'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MapPin, Send } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { usePublicDestinations } from '@/components/public/usePublicDestinations';
import { useHomePageContent } from '@/components/public/useHomePageContent';
import PublicContactLines from '@/components/public/PublicContactLines';
import {
  publicEmails,
  publicPhones,
  publicSocials,
  type HomePageContent,
} from '@/lib/home-page-content';
import SocialBrandIcon from '@/components/public/SocialBrandIcon';
import { destinationPublicPath } from '@/lib/cms-routes';
import Honeypot, { isSpamHoneypot } from '@/components/public/Honeypot';

export default function SiteFooter({ initialHome = null }: { initialHome?: HomePageContent | null }) {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState('');
  const { destinations } = usePublicDestinations();
  const home = useHomePageContent(initialHome);

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    if (isSpamHoneypot(honeypot)) return;
    const response = await fetch('/api/public/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, honeypot }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      console.error('[Subscribe] Failed:', body);
      setStatus(body.error || 'Could not subscribe right now.');
      return;
    }
    setEmail('');
    setStatus('Subscribed. Thank you!');
  }

  const socialItems = publicSocials(home);
  const phoneItems = publicPhones(home);
  const emailItems = publicEmails(home);

  return (
    <footer className="border-t border-[#d9d2c5] bg-[#f6f1e8] text-[#1c1915]">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <BrandLogo size={72} />
          <h4 className="site-footer-title mt-4">The desk</h4>
          <p className="mt-1 max-w-md text-base leading-relaxed text-[#3f3830]">
            {home.ready ? home.footerAbout : ''}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {socialItems.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                aria-label={link.network}
                className="flex h-9 w-9 items-center justify-center border border-[#1c1915] text-[#1c1915] transition hover:bg-[#1c1915] hover:text-[#f6f1e8]"
              >
                <SocialBrandIcon network={link.network} className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <h4 className="site-footer-title">Places</h4>
          <div className="mt-1 grid grid-cols-2 text-base text-[#3f3830]">
            {(destinations ?? [])?.map((destination) => (
              <Link
                key={destination.slug}
                href={destinationPublicPath(destination.slug)}
                className="site-footer-link"
              >
                {destination.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h4 className="site-footer-title">Index</h4>
          <div className="mt-1 space-y-0 text-base">
            <Link href="/" className="site-footer-link block">Home</Link>
            <Link href="/tours" className="site-footer-link block">Routes</Link>
            <Link href="/about-us" className="site-footer-link block">About</Link>
            <Link href="/safari-updates" className="site-footer-link block">Field notes</Link>
            <Link href="/gallery" className="site-footer-link block">Gallery</Link>
            <Link href="/community-support" className="site-footer-link block">Community</Link>
            <Link href="/verify" className="site-footer-link block">Verify a booking</Link>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h4 className="site-footer-title">Write to us</h4>
          <div className="mt-1 space-y-3 text-base text-[#3f3830]">
            {home.ready && home.contactAddress ? (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8a5a2b]" /> {home.contactAddress}
              </p>
            ) : null}
            <PublicContactLines
              phones={phoneItems}
              emails={emailItems}
              rowClassName="site-footer-link flex items-center gap-2"
              iconClassName="h-4 w-4 shrink-0 text-[#8a5a2b]"
            />
            <Link
              href="/request-a-quote"
              className="mt-4 inline-flex border border-[#1c1915] px-4 py-2 text-[13px] uppercase tracking-[0.14em] text-[#1c1915] hover:bg-[#1c1915] hover:text-[#f6f1e8]"
            >
              Plan a route
            </Link>
          </div>
        </div>
      </div>

      <div className="site-newsletter">
        <div className="site-newsletter-title">
          <Send className="h-6 w-6 text-white" strokeWidth={2} />
          <h5>Subscribe to our Newsletter</h5>
        </div>
        <form onSubmit={subscribe} className="site-newsletter-form">
          <Honeypot value={honeypot} onChange={setHoneypot} />
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email address"
          />
          <button type="submit">Sign Up</button>
        </form>
      </div>
      {status && (
        <p className="bg-[#1c1915] px-4 py-2 text-center text-sm text-[#f6f1e8]">{status}</p>
      )}

      <div className="border-t border-[#3a332b] bg-[#1c1915]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 text-base text-[#f6f1e8] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Eton Safaris. All Rights Reserved.</p>
          <div className="flex flex-wrap items-center gap-3">
            {socialItems.map((link) => (
              <a
                key={`footer-${link.id}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                aria-label={link.network}
                className="flex h-8 w-8 items-center justify-center border border-white/20 text-[#f6f1e8] hover:border-[#c4a574]"
              >
                <SocialBrandIcon network={link.network} className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
          <div className="flex gap-4">
            <Link href="/terms-of-services" className="text-[#f6f1e8] hover:text-[#c4a574]">Terms</Link>
            <Link href="/privacy-policies" className="text-[#f6f1e8] hover:text-[#c4a574]">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
