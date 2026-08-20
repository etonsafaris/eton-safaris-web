import Link from 'next/link';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import PageBreadcrumbs from '@/components/public/PageBreadcrumbs';
import PageFavicon from '@/components/public/PageFavicon';
import ResponsiveImage from '@/components/public/ResponsiveImage';

type PageHeroProps = {
  title: string;
  subtitle?: string;
  image?: string | null;
  showDateBar?: boolean;
  variant?: 'default' | 'park' | 'tour' | 'country' | 'policy' | 'about';
  backHref?: string;
  backLabel?: string;
  location?: string;
  duration?: string;
  country?: string;
  groupSize?: string;
  published?: string;
};

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
}: PageHeroProps) {
  const src = image?.trim() || '';
  const isTour = variant === 'tour';
  const isPark = variant === 'park';
  const isCountry = variant === 'country';
  const isPolicy = variant === 'policy';
  const isAbout = variant === 'about';

  return (
    <>
      <PageFavicon title={title} />
      <section
        className={`relative w-full overflow-hidden bg-[#141612] ${isPolicy ? 'h-[430px]' : 'h-[338px] md:h-[398px]'}`}
        style={
          src
            ? { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
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
              {isPark && (location || subtitle) ? (
                <p
                  className="flex items-center justify-center gap-2 text-sm text-white/80"
                  style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}
                >
                  <MapPin className="h-4 w-4" /> {location || subtitle}
                </p>
              ) : subtitle && !isTour && !isCountry ? (
                <p className="text-xs font-semibold uppercase tracking-widest text-sage md:text-sm">{subtitle}</p>
              ) : null}
            </div>
          </div>
        )}
      </section>
      <PageBreadcrumbs currentTitle={title} />
      {isTour ? (
        <div className="bg-forest text-white">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-6 px-4 py-4 md:gap-10 md:px-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-sage" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-white/50">Duration</p>
                <p className="text-sm font-bold">{duration || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-sage" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-white/50">Country</p>
                <p className="text-sm font-bold">{country || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-sage" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-white/50">Group Size</p>
                <p className="text-sm font-bold">{groupSize || 'Flexible'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sage" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-white/50">Published</p>
                <p className="text-sm font-bold">{formatPublishedDate(published)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
