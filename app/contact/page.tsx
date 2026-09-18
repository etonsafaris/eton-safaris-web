'use client';

import { useState } from 'react';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import PublicShellServer from '@/components/public/PublicShellServer';
import ResponsiveImage from '@/components/public/ResponsiveImage';
import SpeakToExpertCard from '@/components/public/SpeakToExpertCard';
import { SITE, SOCIAL_LINKS } from '@/lib/collections';
import { SITE_MEDIA } from '@/lib/site-media';
import { submitWebsiteInquiry } from '@/lib/submit-inquiry';
import Honeypot, { isSpamHoneypot } from '@/components/public/Honeypot';
import MathCaptcha from '@/components/public/MathCaptcha';
import PageFaqList from '@/components/public/PageFaqList';
import { bestFaqsFor } from '@/lib/best-faqs';

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    message: '',
  });
  const [status, setStatus] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [captchaOk, setCaptchaOk] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterHoneypot, setNewsletterHoneypot] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isSpamHoneypot(honeypot)) return;
    if (!captchaOk) {
      setStatus('Complete the security check before sending.');
      return;
    }
    const composed = form.country
      ? `${form.message}\n\nCountry of residence: ${form.country}`
      : form.message;
    const result = await submitWebsiteInquiry({
      name: form.name,
      email: form.email,
      phone: form.phone,
      tour: form.country,
      destination: form.country,
      message: composed,
      title: 'Website inquiry',
      source: 'contact',
      notifyTitle: 'New Inquiry',
    });
    if (result.error) {
      console.error('[Supabase] Contact insert failed:', result.error);
      setStatus(result.error.message);
      return;
    }
    setStatus(
      result.emailed
        ? 'Inquiry received. A notification email was sent.'
        : 'Inquiry saved. Email delivery is not configured yet, so the message was stored but not emailed.'
    );
    setForm({ name: '', email: '', phone: '', country: '', message: '' });
  }

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    if (isSpamHoneypot(newsletterHoneypot)) return;
    const response = await fetch('/api/public/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newsletterEmail.trim(), honeypot: newsletterHoneypot }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      console.error('[Subscribe] Failed:', body);
      setNewsletterStatus(body.error || 'Could not subscribe right now.');
      return;
    }
    setNewsletterEmail('');
    setNewsletterStatus('Subscribed. Thank you!');
  }

  const socialItems = [
    { href: SOCIAL_LINKS.instagram, label: 'Instagram', icon: InstagramSocialIcon },
    { href: SOCIAL_LINKS.linkedin, label: 'LinkedIn', icon: LinkedInSocialIcon },
    { href: SOCIAL_LINKS.facebook, label: 'Facebook', icon: FacebookSocialIcon },
    { href: SOCIAL_LINKS.x, label: 'X', icon: XSocialIcon },
    { href: SOCIAL_LINKS.youtube, label: 'YouTube', icon: YoutubeSocialIcon },
    { href: SOCIAL_LINKS.tiktok, label: 'TikTok', icon: TikTokSocialIcon },
  ];

  return (
    <PublicShellServer>
      <section className="relative flex h-[360px] flex-col items-center justify-center overflow-hidden bg-[#141612] text-white">
        <ResponsiveImage
          src={SITE_MEDIA.talkToUsHero}
          alt="Start planning your safari"
          variant="hero"
          priority
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />
        <h1
          className="relative z-10 mx-auto max-w-[75%] text-center font-merry text-[32px] font-semibold italic md:text-[40px]"
          style={{ textShadow: '0 0 20px #000' }}
        >
          Start Planning your trip
        </h1>
        <p className="relative z-10 mt-2 text-center text-base text-white" style={{ textShadow: '0 0 12px #000' }}>
          Arrange your dream holiday at the comfort of your home
        </p>
      </section>

      <section className="bg-[#f5f5f5] px-4 pb-[30px] pt-2.5 md:px-[50px]">
        <div className="flex flex-col items-start lg:flex-row">
          <div className="m-2.5 w-full lg:w-[70%]">
            <div className="bg-white p-2.5 shadow-sm">
              <iframe
                title="Eton Safaris location"
                src="https://maps.google.com/maps?q=0.316667,32.5&z=12&output=embed"
                className="h-[470px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
          <div className="m-2.5 w-full lg:w-[30%]">
            <SpeakToExpertCard variant="country" showEnquiry={false} />
            <div className="mt-2.5 bg-white px-5 pb-10 pt-5 text-center shadow-sm">
              <h5 className="text-xl font-medium text-black/80">Payment Portal</h5>
              <a
                href="/payment"
                className="mt-6 flex items-center justify-center rounded-[20px] bg-[#5bc787] px-3 py-1.5 text-sm uppercase text-white shadow-[0_7px_29px_rgba(99,99,110,0.2)] hover:bg-[#588048]"
              >
                Pay for Tours
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f5f5f5] px-4 pb-[30px] pt-2.5 md:px-[50px]">
        <div className="flex flex-col items-start lg:flex-row">
          <div className="m-2.5 flex w-full flex-col bg-white p-5 shadow-sm md:flex-row md:gap-4 lg:w-[70%]">
            <div className="contact-lets-talk mx-auto shrink-0 md:mx-0">
              <div className="mb-4 py-2.5 text-center">
                <h2 className="font-merry text-[32px] font-medium italic text-black/80">Let&apos;s Talk</h2>
              </div>
              <form onSubmit={submit}>
                <Honeypot value={honeypot} onChange={setHoneypot} />
                <input
                  required
                  name="name"
                  placeholder="Full Names"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="contact-field"
                />
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="contact-field"
                />
                <input
                  name="country_of_residence"
                  placeholder="Country of Residence"
                  value={form.country}
                  onChange={(event) => setForm({ ...form, country: event.target.value })}
                  className="contact-field"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className="contact-field"
                />
                <textarea
                  required
                  name="message"
                  placeholder="Message"
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  className="contact-field min-h-[88px] resize-y"
                />
                <MathCaptcha onValidChange={setCaptchaOk} />
                <button
                  type="submit"
                  className="mt-2.5 w-full rounded bg-[#5bc787] py-2 text-sm font-medium uppercase text-white hover:bg-[#588048]"
                >
                  Send
                </button>
                {status && <p className="mt-2 text-sm text-[#5bc787]">{status}</p>}
              </form>
            </div>

            <div className="mt-8 w-full p-2.5 md:mt-0 md:max-w-[300px]">
              <div className="flex gap-2 pb-3">
                <Clock className="h-[26px] w-[26px] shrink-0 text-[#f15d30]" />
                <div>
                  <h5 className="text-xl font-medium text-black/80">Office Hours</h5>
                  <p className="pl-2.5 text-base text-[#343434]">Monday - Sunday: Open 24hours</p>
                </div>
              </div>
              <div className="flex gap-2 pb-3">
                <MapPin className="h-[26px] w-[26px] shrink-0 text-[#f15d30]" />
                <div>
                  <h5 className="text-xl font-medium text-black/80">Our Address</h5>
                  <p className="pl-2.5 text-base text-[#343434]">
                    Wakiso District
                    <br />
                    Central Region, Uganda
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pb-3">
                <Phone className="h-[26px] w-[26px] shrink-0 text-[#f15d30]" />
                <div>
                  <h5 className="text-xl font-medium text-black/80">Our Contacts</h5>
                  <ul className="list-none pl-2.5 text-base text-[#343434]">
                    <li>
                      Phone:{' '}
                      <a href={`tel:${SITE.phone}`} className="hover:text-[#5bc787]">
                        {SITE.phoneDisplay}
                      </a>
                    </li>
                    <li>
                      WhatsApp:{' '}
                      <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-[#5bc787]">
                        {SITE.phoneDisplay}
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-2 pb-3">
                <Mail className="h-[26px] w-[26px] shrink-0 text-[#f15d30]" />
                <div>
                  <h5 className="text-xl font-medium text-black/80">Our Email Address</h5>
                  <ul className="list-none pl-2.5 text-base text-[#343434]">
                    <li>
                      <a href={`mailto:${SITE.email}`} className="hover:text-[#5bc787]">
                        {SITE.email}
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="m-2.5 flex w-full flex-col lg:w-[30%]">
            <div className="mb-2.5 bg-white p-5 shadow-sm">
              <h5 className="font-merry text-xl font-medium italic text-black/80">Our Social Media Links</h5>
              <div className="flex flex-wrap justify-center gap-[5px] p-2.5">
                {socialItems.map(({ href, label, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="inline-flex rounded-full bg-[#5bc787] p-2 text-white hover:bg-[#588048]"
                  >
                    <Icon className="h-6 w-6" />
                  </a>
                ))}
              </div>
            </div>
            <div className="bg-white p-5 shadow-sm">
              <h5 className="font-merry text-xl font-medium italic text-black/80">Subscribe to our Newsletters</h5>
              <form onSubmit={subscribe} className="mt-2.5 text-center">
                <Honeypot value={newsletterHoneypot} onChange={setNewsletterHoneypot} />
                <input
                  type="email"
                  required
                  name="email"
                  placeholder="Email"
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  className="contact-field my-5"
                />
                <button
                  type="submit"
                  className="rounded bg-[#5bc787] px-5 py-2 text-sm font-medium uppercase text-white hover:bg-[#588048]"
                >
                  Subscribe
                </button>
                {newsletterStatus && <p className="mt-2 text-sm text-[#5bc787]">{newsletterStatus}</p>}
              </form>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1200px] px-2.5">
          <PageFaqList faqs={bestFaqsFor('contact')} tone="light" />
        </div>
      </section>
    </PublicShellServer>
  );
}

function FacebookSocialIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.845c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function InstagramSocialIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function LinkedInSocialIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM6.877 20.452H3.797V9h3.08v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function YoutubeSocialIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function XSocialIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokSocialIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}
