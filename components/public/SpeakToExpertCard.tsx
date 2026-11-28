'use client';

import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { SITE, SITE_LOGO } from '@/lib/collections';
import PublicContactLines from '@/components/public/PublicContactLines';
import { useHomePageContent } from '@/components/public/useHomePageContent';
import { publicEmails, publicPhones } from '@/lib/home-page-content';
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
  const emails = publicEmails(home);
  if (variant === 'country') {
    const destination = countryName || 'destination';
    return (
      <aside className={`bg-[#f8f9fa] px-5 py-[17px] ${className}`}>
        <h2 className="mb-3 text-center font-merry text-[1.4rem] font-medium italic leading-snug text-[#343434]">
          The Wakiso desk is on this trip
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
        <PublicContactLines
          phones={phones}
          emails={emails}
          className="mt-3 text-sm"
          rowClassName="flex items-center gap-2 text-[#343434] hover:text-[#5bc787]"
          iconClassName="h-4 w-4 shrink-0 text-[#5bc787]"
        />
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
      <h3 className="mb-0.5 text-left font-serif text-sm font-medium text-[#1c1915]">Wakiso desk</h3>
      <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-widest text-sage">
        We&apos;re here to help
      </p>
      <div className="mb-4 flex flex-col gap-2 text-left">
        <div className="flex items-start gap-2 text-xs text-[#444]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" />
          <span>{home.ready ? home.contactAddress : ''}</span>
        </div>
        <PublicContactLines
          phones={phones}
          emails={emails}
          rowClassName="flex items-center gap-2 text-xs text-[#444] hover:text-moss"
          iconClassName="h-3.5 w-3.5 shrink-0 text-sage"
        />
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
