'use client';

import Link from 'next/link';
import { Calendar, CalendarRange, Clock, MapPin, Users } from 'lucide-react';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import PageBreadcrumbs from '@/components/public/PageBreadcrumbs';
import PageFavicon from '@/components/public/PageFavicon';
import ResponsiveImage from '@/components/public/ResponsiveImage';

type ForestItem = {
  label: string;
  value?: string;
};

type PageHeroProps = {
  title: string;
  subtitle?: string;
  image?: string | null;
  showDateBar?: boolean;
  variant?: 'default' | 'park' | 'tour' | 'country' | 'policy' | 'about' | 'update';
  backHref?: string;
  backLabel?: string;
  location?: string;
  duration?: string;
  country?: string;
  groupSize?: string;
  published?: string;
  bestTime?: string;
  metaItems?: ForestItem[];
};

function ForestMetaItem({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  accent?: boolean;
}) {
  if (!Icon || !value) return null;
  if (!Icon) return null;
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 shrink-0 md:h-5 md:w-5 ${accent ? 'text-[#7dce6a]' : 'text-sage'}`} />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wide text-white/50 md:text-[10px]">{label}</p>
        <p className={`text-xs font-bold md:text-sm ${accent ? 'text-[#7dce6a]' : 'text-white'}`}>{value}</p>
      </div>
    </div>
  );
}

export default function PageHero({
  title,
  subtitle,
  image,
  variant = 'default',
  backHref,
  backLabel,
  location,
  duration,
  country,
  groupSize,
  published,
  bestTime,
  metaItems,
}: PageHeroProps) {
  const src = image?.trim() || '';
  const isTour = variant === 'tour';
  const isPark = variant === 'park';
  const isCountry = variant === 'country';
  const isPolicy = variant === 'policy';
  const isAbout = variant === 'about';
  const isUpdate = variant === 'update';
  const customItems = (metaItems || []).filter((item) => {
    if (!item.label) return false;
    if (isUpdate && /^country$/i.test(item.label)) return false;
    return true;
  });
  const publishedLabel = formatPublishedDate(published);
  const customWithPublished = customItems.some((item) => /^published$/i.test(item.label))
    ? customItems
    : [...customItems, { label: 'Published', value: publishedLabel }];
  const showForestBar = true;
  const fullViewportHero = isTour || isCountry || isUpdate || isPark;

  const heroImage = (
    <section
      className={`relative w-full overflow-hidden bg-[#1f3d2b] ${
        fullViewportHero && showForestBar
          ? 'min-h-0 flex-1'
          : 'h-[min(58svh,560px)] min-h-[320px]'
      }`}
    >
      {src ? (
        <ResponsiveImage
          src={src}
          alt={title ?? ''}
          variant="hero"
          priority={true}
          quality={85}
          width={1440}
          height={900}
          className="h-full w-full object-cover"
          useErrorFallback={true}
        />
      ) : (
        <div className="h-full bg-[#1f3d2b]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/20" />
      {isAbout || isPolicy || (!isTour && !isCountry && !isPark && !isUpdate) ? (
        <div className="absolute inset-x-0 bottom-0 px-6 pb-8 text-center md:pb-10">
          <h1
            className={`text-white ${
              isPolicy || isAbout
                ? 'font-merry text-[34px] font-semibold italic leading-tight md:text-[46px]'
                : 'font-serif text-3xl font-bold md:text-5xl'
            }`}
            style={{ textShadow: '0 2px 16px rgba(0,0,0,0.75)' }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-white/90 md:text-base">{subtitle}</p>
          ) : null}
        </div>
      ) : (
        <>
          {isTour && backHref ? (
            <Link
              href={backHref}
              className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white md:left-8 md:top-6"
              style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}
            >
              ← {backLabel || 'Back'}
            </Link>
          ) : null}
          <div
            className={`absolute inset-0 flex items-center justify-center px-5 md:px-10 ${
              isTour ? 'pb-2 pt-12 md:pt-14' : ''
            }`}
          >
            <div className="w-full max-w-[1100px] text-center">
              {!isTour && backHref ? (
                <Link
                  href={backHref}
                  className="mb-3 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
                  style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}
                >
                  ← {backLabel || 'Back'}
                </Link>
              ) : null}
              <h1
                className={`mb-2 text-white ${
                  isTour
                    ? 'mx-auto font-serif text-2xl font-bold leading-snug sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-tight'
                    : isPolicy
                      ? 'font-merry text-[40px] font-semibold italic leading-[48px]'
                      : isCountry
                        ? 'font-serif text-[32px] font-semibold italic leading-tight md:text-[40px]'
                        : 'font-serif text-3xl font-bold md:text-5xl'
                }`}
                style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.9)' }}
              >
                {title}
              </h1>
              {subtitle && !isTour && !isCountry && !isPark ? (
                <p className="text-xs font-semibold uppercase tracking-widest text-sage md:text-sm">{subtitle}</p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );

  const forestMeta = (
    <div className="shrink-0 bg-forest text-white">
      <div
        className={`mx-auto max-w-[1200px] px-4 md:px-6 ${
          isTour ? 'flex flex-col gap-2 py-2.5 md:flex-row md:items-center md:justify-between md:gap-6 md:py-2.5' : 'flex flex-col gap-2 py-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-8 md:py-3'
        }`}
      >
        <div className={isTour ? 'min-w-0 flex-1 md:max-w-[55%]' : 'min-w-0'}>
          <PageBreadcrumbs currentTitle={title} tone="forest" truncateCurrent={isTour} />
        </div>
        <div
          className={`flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 md:gap-8 ${
            isTour ? 'md:justify-end' : ''
          }`}
        >
          {customItems.length > 0 ? (
            customWithPublished.map((item) => (
              <ForestMetaItem
                key={item.label}
                icon={item.label === 'Published' || /time|visit/i.test(item.label) ? Calendar : MapPin}
                label={item.label}
                value={item.label === 'Published' ? formatPublishedDate(item.value) : item.value?.trim() || '—'}
                accent={item.label === 'Published'}
              />
            ))
          ) : isTour ? (
            <>
              <ForestMetaItem icon={Clock} label="Duration" value={duration || '—'} />
              <ForestMetaItem icon={MapPin} label="Country" value={country || '—'} />
              <ForestMetaItem icon={Users} label="Group Size" value={groupSize || 'Flexible'} />
              <ForestMetaItem icon={Calendar} label="Published" value={publishedLabel} accent />
            </>
          ) : isUpdate ? (
            <ForestMetaItem icon={Calendar} label="Published" value={publishedLabel} accent />
          ) : isPark ? (
            <>
              <ForestMetaItem icon={MapPin} label="Location" value={location || '—'} />
              <ForestMetaItem icon={MapPin} label="Country" value={country || '—'} />
              <ForestMetaItem icon={Calendar} label="Published" value={publishedLabel} accent />
            </>
          ) : bestTime ? (
            <>
              <ForestMetaItem icon={CalendarRange} label="Best time to visit" value={bestTime} />
              <ForestMetaItem icon={MapPin} label="Country" value={country || '—'} />
              <ForestMetaItem icon={Calendar} label="Published" value={publishedLabel} accent />
            </>
          ) : (
            <>
              {location ? <ForestMetaItem icon={MapPin} label="Location" value={location} /> : null}
              {country ? <ForestMetaItem icon={MapPin} label="Country" value={country} /> : null}
              <ForestMetaItem icon={Calendar} label="Published" value={publishedLabel} accent />
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PageFavicon title={title} />
      {showForestBar ? (
        <div className={fullViewportHero ? 'flex h-[calc(100svh-5rem)] max-h-[calc(100svh-5rem)] flex-col' : ''}>
          {heroImage}
          {forestMeta}
        </div>
      ) : (
        <>
          {heroImage}
          <PageBreadcrumbs currentTitle={title} />
        </>
      )}
    </>
  );
}
