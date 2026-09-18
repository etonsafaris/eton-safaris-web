import Link from 'next/link';
import { stripPublicMoney } from '@/lib/public-money';
import ResponsiveImage from '@/components/public/ResponsiveImage';

export default function PublicListingCard({
  href,
  image,
  title,
  date,
  location,
  description,
  cta = 'Read More',
}: {
  href: string;
  image?: string;
  title: string;
  date?: string;
  location?: string;
  description?: string;
  cta?: string;
}) {
  const copy = typeof description === 'string' ? stripPublicMoney(description) : '';
  const to = typeof href === 'string' && href.trim() ? href : '/';

  return (
    <Link href={to} className="group flex h-full flex-col overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {image ? (
          <ResponsiveImage
            src={image}
            alt={title || ''}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
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
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#00A651]">{location}</p>
        ) : null}
        {copy ? <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#555]">{copy}</p> : null}
        <div className="mt-auto pt-4">
          <span className="dav-cta">{cta}</span>
        </div>
      </div>
    </Link>
  );
}
