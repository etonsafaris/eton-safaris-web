import { Award, CalendarCheck, Lightbulb, ShieldCheck } from 'lucide-react';
import DeferredVideo from '@/components/public/DeferredVideo';
import { SITE_MEDIA } from '@/lib/site-media';

const FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Personalized Safari Journeys',
    text: 'Share your travel dreams with us, and we will create a carefully tailored safari experience designed around your interests, schedule, and expectations.',
  },
  {
    icon: Lightbulb,
    title: 'Remarkable Safari Experiences',
    text: 'Discover thoughtfully designed journeys, expert local knowledge, hidden safari gems, and carefully selected experiences that make every trip truly memorable.',
  },
  {
    icon: ShieldCheck,
    title: 'Safety, Comfort & Trust',
    text: 'Travel with confidence knowing that your safety, privacy, comfort, and overall experience are carefully considered throughout your journey across Africa.',
  },
  {
    icon: Award,
    title: 'Experienced Local Experts',
    text: 'Travel alongside knowledgeable guides and dedicated local professionals who bring Africa to life through their expertise, warm hospitality, and genuine passion for unforgettable adventures.',
  },
];

const GORILLA_VIDEO = SITE_MEDIA.gorillaVideo;

export default function WhatSetsUsApartSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <h3 className="mb-3 font-merry text-[32px] font-semibold italic text-[#588048]">What Sets Us Apart</h3>
      <p className="mt-3 text-base leading-6 text-[#222]">
        Our passionate and experienced African team combines local knowledge, professional expertise,
        and genuine hospitality to create meaningful journeys filled with discovery, comfort, and
        unforgettable memories.
      </p>

      <div className="mt-10 grid items-stretch gap-10 lg:grid-cols-2">
        <div className="grid gap-8 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-sage/40 bg-sage/15 text-moss">
                <feature.icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="mb-[15px] font-merry text-[1.4rem] font-semibold italic leading-[1.2] text-[#588048]">{feature.title}</h4>
                <p className="text-base leading-7 text-[#222]">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative aspect-[16/9] max-h-[340px] overflow-hidden rounded-2xl bg-black shadow-card">
          <DeferredVideo
            className="absolute inset-0"
            src={GORILLA_VIDEO}
            fallbackSrc={SITE_MEDIA.gorillaVideoFallback}
            poster={SITE_MEDIA.gorillasForest}
          />
        </div>
      </div>
    </section>
  );
}
