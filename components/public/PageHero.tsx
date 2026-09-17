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
  const hasPublishedDate = Boolean(publishedLabel && publishedLabel !== '—');
  const showForestBar =
    isTour ||
    isUpdate ||
    isPark ||
    customItems.length > 0 ||
    hasPublishedDate ||
    (isCountry && (Boolean(bestTime) || Boolean(country) || hasPublishedDate || Boolean(location)));
  const fullBleedHero = isTour || isUpdate || isPark || isCountry;

  const heroImage = (
    <section
      className={`relative w-full overflow-hidden bg-[#141612] ${
        fullBleedHero && showForestBar
          ? 'min-h-0 flex-1'
          : isPolicy
            ? 'h-[min(56svh,520px)]'
            : 'h-[min(42svh,380px)] md:h-[min(46svh,420px)]'
      }`}
    >
      {src ? (
        <ResponsiveImage
          src={src}
          alt={title}
          variant="hero"
          priority
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full bg-[#141612]" />
      )}
      <div className="absolute inset-0 bg-black/18" />
      {isAbout ? (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="rounded-2xl bg-white/85 px-10 py-7 text-center shadow-sm backdrop-blur-[2px] md:px-16">
            <h1 className="font-merry text-[36px] font-semibold italic leading-tight text-[#111] md:text-[44px]">
              {title}
            </h1>
          </div>
        </div>
      ) : (
        <div
          className={`absolute inset-0 flex px-4 md:px-8 ${
            isTour ? 'items-center justify-start' : 'items-center justify-center'
          }`}
        >
          <div className={isTour ? 'mx-auto w-full max-w-[1200px] text-left' : 'text-center'}>
            {isTour && backHref ? (
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
                  ? 'font-serif max-w-3xl text-3xl font-bold md:text-5xl'
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
      )}
    </section>
  );

  const forestMeta = (
    <div className="shrink-0 bg-forest text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-8 md:px-6 md:py-3">
        <PageBreadcrumbs currentTitle={title} tone="forest" />
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 md:gap-10">
          {customItems.length > 0 ? (
            customItems.map((item) => (
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
        <div className={fullBleedHero ? 'flex h-[calc(100svh-5rem)] max-h-[calc(100svh-5rem)] flex-col' : ''}>
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
