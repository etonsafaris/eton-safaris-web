import Link from 'next/link';
import { destinationDisplayName, destinationFlagUrl, destinationHref } from '@/lib/destination-chips';

export default function DestinationChips({ names, tone = 'dark' }: { names: string[]; tone?: 'dark' | 'light' }) {
  const list = Array.isArray(names)
    ? names
        .map((name) => destinationDisplayName(String(name || '').trim()))
        .filter((name) => name.length > 1)
    : [];
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
