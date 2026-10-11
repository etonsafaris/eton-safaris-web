'use client';

import { MapPin, Mail, Phone, Globe2 } from 'lucide-react';
import { SITE, SITE_LOGO } from '@/lib/collections';
import { useHomePageContent } from '@/components/public/useHomePageContent';
import { phoneCallHref, phoneWhatsAppHref, publicPhones } from '@/lib/home-page-content';
import { QUOTE_SERVICES_LINE } from '@/lib/quote-document';

/** Eton quotation masthead — diagonal gold slash, logo left, green brand panel right. */
export function QuoteLetterhead() {
  return (
    <header className="grid overflow-hidden sm:grid-cols-[1.05fr_28px_1.15fr]">
      <div className="flex items-center gap-3 bg-white px-5 py-4 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SITE_LOGO} alt={SITE.name} className="h-14 w-auto sm:h-16" />
        <div>
          <p className="font-serif text-lg font-bold leading-tight text-[#1B4332] sm:text-xl">{SITE.name}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#20A048]">
            {SITE.tagline}
          </p>
        </div>
      </div>
      <div
        className="hidden bg-gradient-to-b from-[#C9A227] via-[#E8C547] to-[#C9A227] sm:block"
        style={{ transform: 'skewX(-18deg)' }}
        aria-hidden
      />
      <div className="flex flex-col justify-center bg-gradient-to-br from-[#14532d] via-[#1B4332] to-[#0f3d24] px-5 py-4 text-white sm:px-7">
        <p className="font-sans text-xl font-extrabold tracking-wide text-[#F5D56A] sm:text-2xl">{SITE.name}</p>
        <p className="mt-0.5 font-serif text-sm italic text-white/95">Tours &amp; Travel Agency</p>
        <p className="mt-2 font-serif text-[11px] italic leading-snug text-white/85">{QUOTE_SERVICES_LINE}</p>
      </div>
    </header>
  );
}

/** Green contact footer with gold edge accents for quotations. */
export function QuoteContactFooter() {
  const home = useHomePageContent();
  const phones = publicPhones(home);
  const phoneItems = phones.flatMap((phone) => {
    const rows: { icon: typeof Phone; label: string; href?: string }[] = [];
    if (phone.call) rows.push({ icon: Phone, label: phone.number, href: phoneCallHref(phone.number) });
    if (phone.whatsapp) rows.push({ icon: Phone, label: `WhatsApp ${phone.number}`, href: phoneWhatsAppHref(phone.number) });
    return rows;
  });
  const items = [
    ...phoneItems,
    { icon: Globe2, label: SITE.url.replace(/^https?:\/\//, ''), href: SITE.url },
    { icon: MapPin, label: home.contactAddress || SITE.address, href: undefined },
    { icon: Mail, label: home.contactEmail || SITE.email, href: `mailto:${home.contactEmail || SITE.email}` },
  ];

  return (
    <footer className="relative bg-[#1B4332] px-5 py-4 text-xs text-white sm:px-7">
      <div
        className="absolute bottom-0 left-0 top-0 w-2.5"
        style={{
          background:
            'repeating-linear-gradient(-55deg, #C9A227, #C9A227 6px, #E8C547 6px, #E8C547 11px)',
        }}
        aria-hidden
      />
      <div className="grid gap-2.5 pl-3 sm:grid-cols-2 sm:gap-x-6">
        {(items ?? [])?.map((item) => {
          const Icon = item.icon;
          const content = (
            <span className="inline-flex items-start gap-2 leading-snug">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F5D56A]" />
              <span>{item.label}</span>
            </span>
          );
          return item.href ? (
            <a key={item.label} href={item.href} className="text-white hover:text-[#F5D56A]" target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
              {content}
            </a>
          ) : (
            <div key={item.label}>{content}</div>
          );
        })}
      </div>
    </footer>
  );
}
