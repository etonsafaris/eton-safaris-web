'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Mail, MapPin, MessageCircle, Send } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { NAV_COUNTRIES, OTHER_DESTINATIONS, SITE, SOCIAL_LINKS } from '@/lib/collections';
import { destinationPublicPath } from '@/lib/cms-routes';
import { notifyWorkspace } from '@/lib/notify';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import Honeypot, { isSpamHoneypot } from '@/components/public/Honeypot';

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.845c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM6.877 20.452H3.797V9h3.08v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function SiteFooter() {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState('');

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    if (isSpamHoneypot(honeypot)) return;
    const { error } = await saveWithColumnFallback('subscribers', { email });
    if (error) {
      console.error('[Supabase] Newsletter subscribe failed:', error);
      setStatus(error.message);
      return;
    }
    await notifyWorkspace({
      title: 'New Subscriber',
      message: `${email} subscribed via the footer.`,
      category: 'subscriber',
      guestEmail: email,
    });
    setEmail('');
    setStatus('Subscribed. Thank you!');
  }

  const destinations = [
    ...NAV_COUNTRIES.map((item) => ({ name: item.name, slug: item.slug })),
    ...OTHER_DESTINATIONS.map((item) => ({ name: item.name, slug: item.slug })),
  ];

  const socialItems = [
    { href: SOCIAL_LINKS.facebook, label: 'Facebook', icon: FacebookIcon },
    { href: SOCIAL_LINKS.x, label: 'X', icon: XIcon },
    { href: SOCIAL_LINKS.tiktok, label: 'TikTok', icon: TikTokIcon },
    { href: SOCIAL_LINKS.youtube, label: 'YouTube', icon: YoutubeIcon },
    { href: SOCIAL_LINKS.instagram, label: 'Instagram', icon: InstagramIcon },
    { href: SOCIAL_LINKS.linkedin, label: 'LinkedIn', icon: LinkedInIcon },
  ];

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
            Eton Safaris is a premier tours and travel agency based in Uganda, offering gorilla trekking, wildlife safaris, and cultural experiences across Africa. Tailor-made luxury expeditions for every clientele.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {socialItems.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:bg-moss hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="site-footer-title">Popular Destinations</h4>
          <div className="mt-1 grid grid-cols-2 text-base text-white">
            {destinations.map((destination) => (
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
            <Link href="/contact-us" className="site-footer-link block">Contact Us</Link>
            <Link href="/about-us" className="site-footer-link block">About Us</Link>
            <Link href="/tours-and-travel-agency" className="site-footer-link block">Tours and Travel Agency</Link>
            <Link href="/safari-updates" className="site-footer-link block">Safari Updates</Link>
            <Link href="/community-support" className="site-footer-link block">Community Support</Link>
            <Link href="/verify" className="site-footer-link block">Verify Booking</Link>
          </div>
        </div>

        <div>
          <h4 className="site-footer-title">Contact Info</h4>
          <div className="mt-1 space-y-3 text-base text-white">
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-white" /> {SITE.address}</p>
            <a href={`https://wa.me/${SITE.whatsapp}`} className="site-footer-link flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-white" /> {SITE.phoneDisplay}
            </a>
            <a href={`mailto:${SITE.email}`} className="site-footer-link flex items-center gap-2">
              <Mail className="h-4 w-4 text-white" /> {SITE.email}
            </a>
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
            {socialItems.map(({ href, label, icon: Icon }) => (
              <a
                key={`footer-${label}`}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70 hover:text-white"
              >
                <Icon className="h-3.5 w-3.5" />
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
