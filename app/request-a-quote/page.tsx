'use client';

import { Suspense } from 'react';
import { Clock, MapPin } from 'lucide-react';
import PublicShellServer from '@/components/public/PublicShellServer';
import QuoteRequestForm from '@/components/public/QuoteRequestForm';
import SpeakToExpertCard from '@/components/public/SpeakToExpertCard';
import PublicContactLines from '@/components/public/PublicContactLines';
import { SITE } from '@/lib/collections';
import { useHomePageContent } from '@/components/public/useHomePageContent';
import { publicEmails, publicPhones } from '@/lib/home-page-content';
import PageFaqList from '@/components/public/PageFaqList';
import { bestFaqsFor } from '@/lib/best-faqs';

export default function RequestQuotePage() {
  const home = useHomePageContent();
  const phones = publicPhones(home);
  const emails = publicEmails(home);
  return (
    <PublicShellServer>
      <section className="relative flex h-[360px] flex-col items-center justify-center overflow-hidden bg-[#141612] text-white">
        <div className="absolute inset-0 bg-black/40" />
        <h1
          className="relative z-10 mx-auto max-w-[90%] text-center font-merry text-[32px] font-semibold italic md:text-[40px]"
          style={{ textShadow: '0 0 20px #000' }}
        >
          Request a Safari Quote
        </h1>
        <p
          className="public-article-body relative z-10 mt-2 max-w-2xl px-4 text-center text-base text-white"
          style={{ textShadow: '0 0 12px #000' }}
        >
          Arrange your dream holiday at the comfort of your home. Permits, lodges, and a private 4x4 itinerary — quoted to your dates and budget.
        </p>
      </section>

      <section className="bg-[#f5f5f5] px-4 py-10 md:px-[50px]">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start lg:flex-row">
          <div className="m-2.5 w-full lg:w-[68%]">
            <Suspense fallback={<div className="rounded bg-white p-10 text-center text-gray-500">Loading quote form…</div>}>
              <QuoteRequestForm />
            </Suspense>
          </div>
          <div className="m-2.5 w-full space-y-2.5 lg:w-[32%]">
            <SpeakToExpertCard variant="country" showEnquiry={false} />
            <div className="bg-white p-5 shadow-sm">
              <div className="flex gap-2 pb-4">
                <Clock className="h-[26px] w-[26px] shrink-0 text-[#f15d30]" />
                <div>
                  <h5 className="text-xl font-medium text-black/80">Office Hours</h5>
                  <p className="public-article-body pl-2.5 text-base text-[#343434]">Monday - Sunday: Open 24 hours</p>
                </div>
              </div>
              <div className="flex gap-2 pb-4">
                <MapPin className="h-[26px] w-[26px] shrink-0 text-[#f15d30]" />
                <div>
                  <h5 className="text-xl font-medium text-black/80">Our Address</h5>
                  <p className="public-article-body pl-2.5 text-base text-[#343434]">{home.contactAddress || SITE.address}</p>
                </div>
              </div>
              <div className="flex gap-2 pb-4">
                <div className="w-full">
                  <h5 className="text-xl font-medium text-black/80">Our Contacts</h5>
                  <PublicContactLines
                    phones={phones}
                    emails={[]}
                    className="public-article-body mt-2 text-base text-[#343434]"
                    rowClassName="flex items-center gap-2 hover:text-[#5bc787]"
                    iconClassName="h-4 w-4 shrink-0 text-[#f15d30]"
                    labelClassName="w-[4.6rem] shrink-0 font-semibold"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-full">
                  <h5 className="text-xl font-medium text-black/80">Email</h5>
                  <PublicContactLines
                    phones={[]}
                    emails={emails}
                    className="public-article-body mt-2 text-base text-[#343434]"
                    rowClassName="flex items-center gap-2 hover:text-[#5bc787]"
                    iconClassName="h-4 w-4 shrink-0 text-[#f15d30]"
                  />
                </div>
              </div>
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
