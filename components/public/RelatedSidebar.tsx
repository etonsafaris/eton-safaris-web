import Link from 'next/link';
import SpeakToExpertCard from '@/components/public/SpeakToExpertCard';

export type RelatedSidebarItem = {
  href: string;
  image?: string | null;
  title: string;
  date?: string;
};

export default function RelatedSidebar({
  title,
  items,
  countryName = '',
  showExpert = true,
}: {
  title: string;
  items: RelatedSidebarItem[];
  countryName?: string;
  showExpert?: boolean;
}) {
  return (
    <aside className="lg:col-span-1 lg:self-start">
      {items.length > 0 ? (
        <div className="rounded-[20px] bg-[#edf2f2] p-2.5">
          <div className="p-2.5">
            <h2 className="mb-0 text-[28px] font-normal italic leading-[1.2] text-[#6aa441]">{title}</h2>
          </div>
          <ul className="list-none px-5 text-[#343434]">
            {items.map((item) => (
              <li key={item.href} className="border-b border-[#d7e0e0] py-3 last:border-b-0">
                <Link href={item.href} className="group flex items-start gap-3">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-[72px] shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-14 w-[72px] shrink-0 rounded bg-[#d7e0e0]" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-base leading-6 text-black group-hover:text-[#6aa441]">
                      {item.title}
                    </span>
                    {item.date && item.date !== '—' ? (
                      <span className="mt-1 block text-right font-serif text-sm italic text-[#aaaaaa]">
                        {item.date}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {showExpert ? (
        <div className={items.length > 0 ? 'mt-6' : ''}>
          <SpeakToExpertCard variant="country" countryName={countryName} />
        </div>
      ) : null}
    </aside>
  );
}
