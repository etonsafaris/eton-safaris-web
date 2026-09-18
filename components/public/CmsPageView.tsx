'use client';

import Link from 'next/link';
import { ArrowRight, Globe, Heart, Leaf, Users } from 'lucide-react';
import DestinationChips from '@/components/public/DestinationChips';
import PageFaqList from '@/components/public/PageFaqList';
import PageHero from '@/components/public/PageHero';
import PublicShell from '@/components/public/PublicShell';
import ResponsiveImage from '@/components/public/ResponsiveImage';
import SectionHeading from '@/components/public/SectionHeading';
import { PUBLIC_SITE_LABELS } from '@/lib/collections';
import { publicBodyHtml } from '@/lib/embedded-content';
import type { CmsContentBlock, CmsPageLayout, PageFaq } from '@/lib/cms-page-model';

function toHtml(content: string) {
  const cleaned = publicBodyHtml(content).trim();
  if (!cleaned) return '';
  if (/<[a-z][\s\S]*>/i.test(cleaned)) return cleaned;
  return cleaned
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export type CmsPageViewProps = {
  title: string;
  image?: string;
  content: string;
  variant?: CmsPageLayout | 'default' | 'policy';
  subtitle?: string;
  videoUrl?: string;
  destinations?: string[];
  faqs?: PageFaq[];
  blocks?: CmsContentBlock[];
  ctaLabel?: string;
  ctaHref?: string;
  published?: string;
};

function AboutStory({
  blocks,
  html,
  videoUrl,
  image,
}: {
  blocks: CmsContentBlock[];
  html: string;
  videoUrl?: string;
  image?: string;
}) {
  if (blocks.length > 0) {
    return (
      <div className="space-y-10">
        {blocks.map((block, index) => {
          const visual = block.image_url || (index === 0 ? videoUrl : '') || (index === 0 ? image : '');
          const isVideo = Boolean(index === 0 && videoUrl && !block.image_url);
          const copy = toHtml(block.description);
          const reverse = index % 2 === 1;
          return (
            <div
              key={`${block.title}-${index}`}
              className={`grid grid-cols-1 items-center gap-8 md:grid-cols-2 ${reverse ? 'md:[&>*:first-child]:order-2' : ''}`}
            >
              <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
                {isVideo && videoUrl ? (
                  <video className="aspect-video h-full w-full object-cover" autoPlay loop muted playsInline>
                    <source src={videoUrl} type="video/mp4" />
                  </video>
                ) : visual ? (
                  <ResponsiveImage src={visual} alt="" variant="card" className="aspect-video h-full w-full object-cover" />
                ) : (
                  <div className="aspect-video bg-[#f3f4f6]" />
                )}
              </div>
              <div>
                {block.title ? (
                  <h2 className="font-merry text-[28px] font-semibold italic text-[#111] md:text-[32px]">{block.title}</h2>
                ) : null}
                {copy ? (
                  <div className="public-prose mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: copy }} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return html ? (
    <div className="public-prose mx-auto max-w-4xl" dangerouslySetInnerHTML={{ __html: html }} />
  ) : null;
}

export default function CmsPageView({
  title,
  image,
  content,
  variant = 'default',
  subtitle,
  videoUrl,
  destinations = [],
  faqs = [],
  blocks = [],
  ctaLabel = PUBLIC_SITE_LABELS.getInTouch,
  ctaHref = '/contact-us',
  published,
}: CmsPageViewProps) {
  const html = toHtml(content);
  const layout = variant === 'default' ? 'standard' : variant;

  if (layout === 'policy') {
    const html = toHtml(content);
    return (
      <PublicShell>
        <PageHero title={title} image={image} variant="policy" published={published} />
        <section className="bg-[#edf2f2] pb-10">
          {html ? (
            <div className="dav-policies mx-4 bg-white p-[30px] lg:mx-[100px]" dangerouslySetInnerHTML={{ __html: html }} />
          ) : content.trim() ? (
            <div className="dav-policies public-article-body mx-4 whitespace-pre-wrap bg-white p-[30px] lg:mx-[100px]">
              {content}
            </div>
          ) : null}
          <div className="mx-4 mt-8 max-w-4xl lg:mx-[100px]">
            <PageFaqList faqs={faqs} tone="light" />
          </div>
        </section>
      </PublicShell>
    );
  }

  if (layout === 'community') {
    return (
      <PublicShell>
        <PageHero title={title} subtitle={subtitle} image={image} published={published} />
        <section className="mx-auto max-w-4xl px-4 py-16 text-center">
          <SectionHeading label="Giving back" title="Tourism That Transforms Lives" />
          {html ? (
            <div className="public-prose mx-auto mt-6 max-w-3xl text-[#666]" dangerouslySetInnerHTML={{ __html: html }} />
          ) : null}
        </section>
        {blocks.length > 0 ? (
          <section className="bg-[#f9f9f9] py-16">
            <div className="mx-auto max-w-7xl px-4">
              <SectionHeading label="What we do" title="Our Community Initiatives" />
              <div className="mt-10 grid gap-8 md:grid-cols-2">
                {blocks.map((block) => (
                  <article key={block.title} className="overflow-hidden bg-white shadow-sm">
                    {block.image_url ? (
                      <ResponsiveImage src={block.image_url} alt={block.title} variant="card" className="h-56 w-full object-cover" />
                    ) : (
                      <div className="h-56 w-full bg-[#e8ece9]" />
                    )}
                    <div className="p-6">
                      <h3 className="font-serif text-2xl font-bold text-[#333]">{block.title}</h3>
                      <div
                        className="public-prose mt-3 text-[#666]"
                        dangerouslySetInnerHTML={{ __html: toHtml(block.description) }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}
        <section className="mx-auto max-w-4xl px-4 pb-8">
          <PageFaqList faqs={faqs} tone="light" />
        </section>
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4">
            <SectionHeading label="Our values" title="What Drives Us" />
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Heart, title: 'Authentic Connections', text: 'We foster genuine cultural exchange between travelers and local communities.' },
                { icon: Leaf, title: 'Sustainable Tourism', text: 'Every safari is designed to minimize environmental impact and maximize community benefit.' },
                { icon: Users, title: 'Local Empowerment', text: 'We empower local people through fair employment, training, and community investment.' },
                { icon: Globe, title: 'Global Responsibility', text: 'We believe travel can be a force for good — bridging cultures and supporting conservation.' },
              ].map((value) => (
                <div key={value.title} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage/20 text-moss">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h4 className="mt-4 font-serif text-lg font-bold text-[#333]">{value.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-[#666]">{value.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="bg-forest py-16 text-center text-white">
          <div className="mx-auto max-w-3xl px-4">
            <Heart className="mx-auto h-8 w-8 text-sage" />
            <h2 className="mt-4 font-serif text-3xl font-bold">Travel With Purpose</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/90">
              When you book a safari with Eton Safaris, you&apos;re not just embarking on an adventure — you&apos;re
              supporting communities, conservation, and a more sustainable future for Africa.
            </p>
            <Link
              href={ctaHref}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-moss px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#4a6b3a]"
            >
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </PublicShell>
    );
  }

  if (layout === 'about' || layout === 'agency') {
    return (
      <PublicShell>
        <PageHero title={title} image={image} variant="about" published={published} />
        <section className="bg-white px-4 py-14 text-[#222] md:px-8 md:py-16">
          <div className="mx-auto max-w-[1100px]">
            <AboutStory blocks={blocks} html={html} videoUrl={videoUrl} image={image} />
            <DestinationChips names={destinations} tone="light" />
            <PageFaqList faqs={faqs} tone="light" />
            <div className="mt-10">
              <Link
                href={ctaHref}
                className="inline-flex items-center justify-center rounded-full bg-[#00A651] px-6 py-3 text-sm font-semibold text-white hover:bg-[#009247]"
              >
                {ctaLabel} →
              </Link>
            </div>
          </div>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <PageHero title={title} subtitle={subtitle} image={image} published={published} />
      <section className="bg-white px-4 py-14 text-[#222] md:py-16">
        <div className="mx-auto max-w-3xl">
          {html ? (
            <div
              className="public-prose max-w-none [&_h4]:font-serif [&_h4]:text-2xl [&_h4]:italic"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="public-article-body whitespace-pre-wrap text-sm leading-relaxed text-[#444] md:text-base">{content}</div>
          )}
          <DestinationChips names={destinations} tone="light" />
          <PageFaqList faqs={faqs} tone="light" />
          <Link href={ctaHref} className="mt-10 inline-block text-sm font-semibold text-[#00A651] hover:text-[#006400]">
            {ctaLabel} →
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
