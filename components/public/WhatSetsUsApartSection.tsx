'use client';

import { Award, CalendarCheck, Lightbulb, ShieldCheck } from 'lucide-react';
import HomeVideoCarousel from '@/components/public/HomeVideoCarousel';
import {
  DEFAULT_HOME_FEATURES,
  DEFAULT_HOME_PAGE_CONTENT,
  type HomeFeaturePoint,
} from '@/lib/home-page-content';

const ICONS = [CalendarCheck, Lightbulb, ShieldCheck, Award];

export default function WhatSetsUsApartSection({
  heading = DEFAULT_HOME_PAGE_CONTENT.setsApartHeading,
  intro = DEFAULT_HOME_PAGE_CONTENT.setsApartIntro,
  features = DEFAULT_HOME_FEATURES,
  videos = [],
}: {
  heading?: string;
  intro?: string;
  features?: HomeFeaturePoint[];
  videos?: string[];
}) {
  const points = (features?.length ? features : DEFAULT_HOME_FEATURES).slice(0, 4);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <h3 className="mb-3 font-merry text-[32px] font-semibold italic text-[#588048]">{heading}</h3>
      <p className="mt-3 text-base leading-6 text-[#222]">{intro}</p>

      <div className="mt-10 grid items-stretch gap-10 lg:grid-cols-2">
        <div className="grid gap-8 sm:grid-cols-2">
          {points.map((feature, index) => {
            const Icon = ICONS[index % ICONS.length];
            return (
              <div key={`${feature.title}-${index}`} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-sage/40 bg-sage/15 text-moss">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="mb-[15px] font-merry text-[1.4rem] font-semibold italic leading-[1.2] text-[#588048]">
                    {feature.title}
                  </h4>
                  <p className="text-base leading-7 text-[#222]">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <HomeVideoCarousel videos={videos} />
      </div>
    </section>
  );
}
