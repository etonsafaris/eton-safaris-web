import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import DavCtaButton from '@/components/public/DavCtaButton';
import ResponsiveImage from '@/components/public/ResponsiveImage';
import { stripPublicMoney } from '@/lib/public-money';

export default function PlaceCard({
  href,
  image,
  title,
  location,
  description,
  date,
  cta = 'Read More',
}: {
  href: string;
  image?: string;
  title: string;
  location?: string;
  description?: string;
  date?: string;
  cta?: string;
}) {
  return (
    <Link href={href} className="group flex h-full flex-col bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {image ? (
          <ResponsiveImage
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {date ? (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#00A651]">{date}</p>
        ) : null}
        <h2 className="text-[15px] font-bold leading-snug text-[#111]">{title}</h2>
        {location ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#00A651]">
            <MapPin className="h-3.5 w-3.5" /> {location}
          </p>
        ) : null}
        {description ? (
          <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[#555]">
            {stripPublicMoney(description)}
          </p>
        ) : null}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-3.5 w-3.5 fill-none text-[#222]" strokeWidth={1.6} />
            ))}
          </div>
          <DavCtaButton>{cta}</DavCtaButton>
        </div>
      </div>
    </Link>
  );
}
