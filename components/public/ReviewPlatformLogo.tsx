import type { ReviewPlatformId } from '@/lib/home-page-content';

const LOGO_SRC: Record<ReviewPlatformId, string> = {
  tripadvisor: '/review-logos/tripadvisor.svg',
  google: '/review-logos/google.svg',
  safaribookings: '/review-logos/safaribookings.png',
  trustpilot: '/review-logos/trustpilot.svg',
  travelstride: '/review-logos/travelstride.png',
  safaripicked: '/review-logos/safaripicked.svg',
  tourradar: '/review-logos/tourradar.png',
  getyourguide: '/review-logos/getyourguide.svg',
  viator: '/review-logos/viator.png',
  facebook: '/review-logos/facebook.svg',
  booking: '/review-logos/booking.svg',
  trip: '/review-logos/trip.svg',
};

const WIDE = new Set<ReviewPlatformId>(['getyourguide', 'trip', 'booking']);

/** Official platform mark in its own brand colors. */
export default function ReviewPlatformLogo({
  id,
  className = 'h-9 w-9',
}: {
  id: ReviewPlatformId;
  className?: string;
}) {
  const wide = WIDE.has(id) && className === 'h-9 w-9';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC[id]}
      alt=""
      className={wide ? 'h-8 w-auto max-w-[9rem] object-contain' : `${className} object-contain`}
    />
  );
}
