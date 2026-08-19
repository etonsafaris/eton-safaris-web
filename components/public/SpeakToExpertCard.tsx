'use client';

import Link from 'next/link';
import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { SITE, SITE_LOGO } from '@/lib/collections';

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
  if (variant === 'country') {
    const destination = countryName || 'destination';
    return (
      <aside className={`bg-[#f8f9fa] px-5 py-[17px] ${className}`}>
        <h2 className="mb-3 text-center font-merry text-[1.4rem] font-medium italic leading-[1.4] text-[#343434]">
          Speak to an expert
          <br /> who&apos;s there
        </h2>
        <div className="flex items-start">
          <img
            src={SITE_LOGO}
            alt={SITE.name}
            className="mr-4 h-20 w-20 shrink-0 object-contain"
          />
          <p className="text-base leading-6 text-[#222]">
            Start planning your trip by contacting one of our {destination} specialists.
          </p>
        </div>
        <ul className="mt-3 list-none text-center">
          <li className="border-b border-[#eee] py-0.5">
            <a href={`tel:${SITE.phone}`} className="font-bold text-[#5bc787] hover:underline">
              {SITE.phoneDisplay}
            </a>
          </li>
          <li className="border-b border-[#eee] py-0.5">
            <a
              href={`https://wa.me/${SITE.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-[#5bc787] hover:underline"
            >
              {SITE.phoneDisplay}
            </a>
          </li>
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
      </aside>
    );
  }

  return (
    <aside className={`border border-gray-100 bg-white p-5 shadow-card ${className || 'rounded-xl'}`}>
      <img src={SITE_LOGO} alt={SITE.name} className="mx-auto mb-3 h-14 w-auto object-contain" />
      <h3 className="mb-0.5 text-center font-serif text-sm font-bold text-[#333]">Speak to an Expert</h3>
      <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-widest text-sage">
        We&apos;re here to help
      </p>
      <div className="mb-4 flex flex-col gap-2 text-left">
        <div className="flex items-start gap-2 text-xs text-[#444]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" />
          <span>Wakiso District, Uganda</span>
        </div>
        <a href={`tel:${SITE.phone}`} className="flex items-center gap-2 text-xs text-[#444] hover:text-moss">
          <Phone className="h-3.5 w-3.5 shrink-0 text-sage" />
          {SITE.phoneDisplay}
        </a>
        <a
          href={`https://wa.me/${SITE.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs text-[#444] hover:text-moss"
        >
          <MessageCircle className="h-3.5 w-3.5 shrink-0 text-sage" />
          WhatsApp Chat
        </a>
        <a href={`mailto:${SITE.email}`} className="flex items-center gap-2 text-xs text-[#444] hover:text-moss">
          <Mail className="h-3.5 w-3.5 shrink-0 text-sage" />
          {SITE.email}
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
