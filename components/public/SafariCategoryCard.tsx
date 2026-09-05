import { getRecordImage, getRecordTitle } from '@/lib/data';
import type { RecordRow } from '@/lib/types';
import Link from 'next/link';

type SafariCategoryCardProps = {
  category: RecordRow;
  active?: boolean;
  onClick?: () => void;
  titleOnly?: boolean;
  href?: string;
  countryName?: string;
};

const CARD_SHADOW =
  'rgba(3, 54, 63, 0.16) 0px 4px 8px 0px, rgba(3, 54, 63, 0.08) 0px 2px 4px 0px, rgba(3, 54, 63, 0.16) 0px 1px 2px 0px, rgba(3, 54, 63, 0.04) 0px -1px 2px 0px';

export default function SafariCategoryCard({
  category,
  active = false,
  onClick,
  titleOnly = true,
  href,
}: SafariCategoryCardProps) {
  const title = getRecordTitle(category);
  const image = getRecordImage(category);

  const inner = (
    <>
      <div className="h-[130px] overflow-hidden rounded-[15px] bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={title}
            width={320}
            height={130}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">No image</div>
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
      <Link href={href} className={className} style={{ boxShadow: CARD_SHADOW }}>
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
