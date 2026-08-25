import Link from 'next/link';
import { destinationDisplayName, destinationFlagUrl, destinationHref } from '@/lib/destination-chips';

/** Normalize CMS destination lists — including string→char-array bugs ("Madagascar" → ["M","a",…]). */
function normalizeChipNames(names: string[] | string | null | undefined): string[] {
  if (typeof names === 'string') {
    return names
      .split(/[,|\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 1);
  }
  if (!Array.isArray(names) || !names.length) return [];
  const items = names.map((item) => String(item || '').trim()).filter(Boolean);
  if (items.length > 2 && items.every((item) => item.length === 1)) {
    return normalizeChipNames(items.join(''));
  }
  return items;
}

export default function DestinationChips({
  names,
  tone = 'dark',
}: {
  names: string[] | string;
  tone?: 'dark' | 'light';
}) {
  const list = normalizeChipNames(names)
    .map((name) => destinationDisplayName(name))
    .filter((name) => name.length > 1);
  if (!list.length) return null;
  const light = tone === 'light';
  return (
    <div className="mt-10 flex flex-wrap justify-center gap-3">
      {list.map((name) => {
        const flag = destinationFlagUrl(name, 80);
        return (
          <Link
            key={name}
            href={destinationHref(name)}
            className={
              light
                ? 'inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm text-[#111] shadow-sm transition hover:border-[#00A651] hover:text-[#00A651]'
                : 'inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white transition hover:border-[#00A651] hover:bg-[#00A651]/20'
            }
          >
            {flag ? (
              <img src={flag} alt="" width={28} height={20} className="h-5 w-7 rounded-sm object-cover" />
            ) : null}
            {name}
          </Link>
        );
      })}
    </div>
  );
}
