import CategoryThumbnail from '@/components/public/CategoryThumbnail';
import { DEFAULT_CATEGORY_CARD_IMAGE } from '@/lib/category-display-image';
import { getRecordTitle } from '@/lib/data';
import type { RecordRow } from '@/lib/types';
import Link from 'next/link';

type SafariCategoryCardProps = {
  category: RecordRow;
  active?: boolean;
  onClick?: () => void;
  titleOnly?: boolean;
  href?: string;
  countryName?: string;
  image?: string;
};

const CARD_SHADOW =
  'rgba(3, 54, 63, 0.16) 0px 4px 8px 0px, rgba(3, 54, 63, 0.08) 0px 2px 4px 0px, rgba(3, 54, 63, 0.16) 0px 1px 2px 0px, rgba(3, 54, 63, 0.04) 0px -1px 2px 0px';

export default function SafariCategoryCard({
  category,
  active = false,
  onClick,
  titleOnly = true,
  href,
  image: imageOverride,
}: SafariCategoryCardProps) {
  const title = getRecordTitle(category);

  const inner = (
    <>
      <div
        className="relative h-[130px] w-full overflow-hidden rounded-[15px] bg-gray-100"
        style={{ minHeight: 130, aspectRatio: '320 / 130' }}
      >
        {imageOverride ? (
          <img
            src={imageOverride}
            alt={title}
            width={320}
            height={130}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={(event) => {
              try {
                const img = event.currentTarget;
                if (img.src !== DEFAULT_CATEGORY_CARD_IMAGE) {
                  img.src = DEFAULT_CATEGORY_CARD_IMAGE;
                  return;
                }
                img.style.visibility = 'hidden';
              } catch {
                // ignore
              }
            }}
          />
        ) : (
          <CategoryThumbnail category={category} alt={title ? `${title} safari category` : 'Safari category'} />
        )}
      </div>
      <h5 className="px-1 py-3 text-center text-[15px] font-medium leading-[18px] text-[#323637]">
        {title}
      </h5>
    </>
  );

  const className = `block w-full overflow-hidden rounded-[15px] bg-white p-2 text-left transition hover:-translate-y-0.5 ${
    active ? 'ring-2 ring-[#5bc787]/40' : ''
  }`;

  if (href) {
    return (
      <Link href={href} prefetch className={className} style={{ boxShadow: CARD_SHADOW }}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} style={{ boxShadow: CARD_SHADOW }}>
      {inner}
    </button>
  );
}
