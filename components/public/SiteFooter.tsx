'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MapPin, Send } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { usePublicDestinations } from '@/components/public/usePublicDestinations';
import { useHomePageContent } from '@/components/public/useHomePageContent';
import { PUBLIC_SITE_LABELS } from '@/lib/collections';
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
    <footer className="bg-forest text-white">
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
        <p className="bg-[#004824] px-4 py-2 text-center text-sm text-white">{status}</p>
      )}

      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandLogo light size={72} />
          <h4 className="site-footer-title">About Us</h4>
          <p className="mt-1 text-base leading-relaxed text-white">
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
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:bg-moss hover:text-white"
              >
                <SocialBrandIcon network={link.network} className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="site-footer-title">Popular Destinations</h4>
          <div className="mt-1 grid grid-cols-2 text-base text-white">
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

        <div>
          <h4 className="site-footer-title">Quick Links</h4>
          <div className="mt-1 space-y-0 text-base">
            <Link href="/" className="site-footer-link block">Home</Link>
            <Link href="/contact-us" className="site-footer-link block">{PUBLIC_SITE_LABELS.getInTouch}</Link>
            <Link href="/about-us" className="site-footer-link block">About Us</Link>
            <Link href="/tours-and-travel-agency" className="site-footer-link block">Tours and Travel Agency</Link>
            <Link href="/tours" className="site-footer-link block">Safari Tours</Link>
            <Link href="/safari-updates" className="site-footer-link block">{PUBLIC_SITE_LABELS.blogPosts}</Link>
            <Link href="/gallery" className="site-footer-link block">Gallery</Link>
            <Link href="/community-support" className="site-footer-link block">Community Support</Link>
            <Link href="/verify" className="site-footer-link block">Verify Booking</Link>
          </div>
        </div>

        <div>
          <h4 className="site-footer-title">Contact Info</h4>
          <div className="mt-1 space-y-3 text-base text-white">
            {home.ready && home.contactAddress ? (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white" /> {home.contactAddress}
              </p>
            ) : null}
            <PublicContactLines
              phones={phoneItems}
              emails={emailItems}
              rowClassName="site-footer-link flex items-center gap-2"
              iconClassName="h-4 w-4 shrink-0 text-white"
            />
            <Link
              href="/request-a-quote"
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#f5c518] px-5 py-3 text-center text-[15px] font-extrabold uppercase tracking-wide text-[#111] shadow-[0_4px_0_#c49200,0_8px_18px_rgba(0,0,0,0.28)] transition hover:bg-[#ffd84d] hover:shadow-[0_2px_0_#c49200,0_6px_14px_rgba(0,0,0,0.25)]"
            >
              Request a Quote
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 text-base text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Eton Safaris. All Rights Reserved.</p>
          <div className="flex flex-wrap items-center gap-3">
            {socialItems.map((link) => (
              <a
                key={`footer-${link.id}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                aria-label={link.network}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70 hover:text-white"
              >
                <SocialBrandIcon network={link.network} className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
          <div className="flex gap-4">
            <Link href="/terms-of-services" className="site-footer-link">Terms of Services</Link>
            <Link href="/privacy-policies" className="site-footer-link">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
