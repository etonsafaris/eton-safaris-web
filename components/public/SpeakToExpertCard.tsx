'use client';

import Link from 'next/link';
import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { SITE, SITE_LOGO } from '@/lib/collections';
import { useHomePageContent } from '@/components/public/useHomePageContent';
import { phoneCallHref, phoneWhatsAppHref, publicPhones } from '@/lib/home-page-content';
import { quoteRequestPath } from '@/lib/quote-request';

export default function SpeakToExpertCard({
  className = '',
  inquiryHref = '/contact-us',
  variant = 'default',
  countryName = '',
  showEnquiry = true,
}: {
  className?: string;
  inquiryHref?: string;
  variant?: 'default' | 'country';
  countryName?: string;
  showEnquiry?: boolean;
}) {
  const home = useHomePageContent();
  const phones = publicPhones(home);
  if (variant === 'country') {
    const destination = countryName || 'destination';
    return (
      <aside className={`bg-[#f8f9fa] px-5 py-[17px] ${className}`}>
        <h2 className="mb-3 text-center font-merry text-[1.4rem] font-medium italic leading-snug text-[#343434]">
          Speak to an expert who&apos;s there
        </h2>
        <div className="flex items-start">
          <img
            src={SITE_LOGO}
            alt={SITE.name}
            width={80}
            height={80}
            loading="lazy"
            decoding="async"
            className="mr-4 h-20 w-20 shrink-0 object-contain"
          />
          <p className="text-base leading-6 text-[#222]">
            Start planning your trip by contacting one of our {destination} specialists.
          </p>
        </div>
        <ul className="mt-3 list-none text-center">
          {phones.map((phone) => (
            <li key={phone.id} className="border-b border-[#eee] py-0.5">
              {phone.call ? (
                <a href={phoneCallHref(phone.number)} className="block font-bold text-[#5bc787] hover:underline">
                  {phone.number}
                </a>
              ) : null}
              {phone.whatsapp ? (
                <a
                  href={phoneWhatsAppHref(phone.number)}
                  target="_blank"
                  rel="noreferrer"
                  className="block font-bold text-[#5bc787] hover:underline"
                >
                  WhatsApp {phone.number}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
        {showEnquiry ? (
          <div className="mt-4 text-center">
            <Link
              href={inquiryHref}
              className="inline-block rounded-[2px] bg-[#5bc787] px-5 py-2 text-lg leading-[27px] text-white hover:bg-[#4db877]"
            >
              Make an enquiry
            </Link>
          </div>
        ) : null}
        <div className="mt-3 text-center">
          <Link
            href={quoteRequestPath({ country: countryName })}
            className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-[#f5c518] px-5 py-3 text-center text-[15px] font-extrabold uppercase tracking-wide text-[#111] shadow-[0_4px_0_#c49200,0_8px_18px_rgba(0,0,0,0.28)] transition hover:bg-[#ffd84d] hover:shadow-[0_2px_0_#c49200,0_6px_14px_rgba(0,0,0,0.25)]"
          >
            Request a Quote
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`border border-gray-100 bg-white p-5 shadow-card ${className || 'rounded-xl'}`}>
      <img src={SITE_LOGO} alt={SITE.name} width={224} height={56} loading="lazy" decoding="async" className="mx-auto mb-3 h-14 w-auto object-contain" />
      <h3 className="mb-0.5 text-center font-serif text-sm font-bold text-[#333]">Speak to an Expert</h3>
      <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-widest text-sage">
        We&apos;re here to help
      </p>
      <div className="mb-4 flex flex-col gap-2 text-left">
        <div className="flex items-start gap-2 text-xs text-[#444]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" />
          <span>{home.contactAddress || 'Wakiso District, Uganda'}</span>
        </div>
        {phones.map((phone) => (
          <div key={phone.id} className="flex flex-col gap-2">
            {phone.call ? (
              <a href={phoneCallHref(phone.number)} className="flex items-center gap-2 text-xs text-[#444] hover:text-moss">
                <Phone className="h-3.5 w-3.5 shrink-0 text-sage" />
                {phone.number}
              </a>
            ) : null}
            {phone.whatsapp ? (
              <a
                href={phoneWhatsAppHref(phone.number)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs text-[#444] hover:text-moss"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0 text-sage" />
                WhatsApp {phone.number}
              </a>
            ) : null}
          </div>
        ))}
        <a href={`mailto:${home.contactEmail || SITE.email}`} className="flex items-center gap-2 text-xs text-[#444] hover:text-moss">
          <Mail className="h-3.5 w-3.5 shrink-0 text-sage" />
          {home.contactEmail || SITE.email}
        </a>
      </div>
      <Link
        href={inquiryHref}
        className="flex items-center justify-center gap-2 rounded-full bg-moss px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#4a6b3a]"
      >
        Make Inquiry <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </aside>
  );
}
