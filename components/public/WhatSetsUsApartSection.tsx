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

      <div className="mt-8 grid items-center gap-6 overflow-hidden lg:grid-cols-2 lg:gap-6">
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          {points.map((feature, index) => {
            const Icon = ICONS[index % ICONS.length];
            return (
              <div key={`${feature.title}-${index}`} className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sage/40 bg-sage/15 text-moss">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="mb-1.5 font-merry text-[1.15rem] font-semibold italic leading-[1.2] text-[#588048]">
                    {feature.title}
                  </h4>
                  <p className="text-sm leading-6 text-[#222]">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="min-w-0 self-stretch lg:flex lg:items-center">
          <HomeVideoCarousel videos={videos} className="w-full" />
        </div>
      </div>
    </section>
  );
}
