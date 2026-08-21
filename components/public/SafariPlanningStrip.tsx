import { CalendarRange, Clock3, MapPinned, Ticket } from 'lucide-react';
import { countryPlanning } from '@/lib/country-planning';

export default function SafariPlanningStrip({
  slug,
  countryName,
  bestTime,
}: {
  slug: string;
  countryName: string;
  bestTime?: string;
}) {
  const plan = countryPlanning(slug, countryName);
  const items = [
    { icon: CalendarRange, label: 'Best time to visit', value: bestTime?.trim() || plan.bestTime },
    { icon: Clock3, label: 'Typical stay', value: plan.typicalStay },
    { icon: Ticket, label: 'Book ahead', value: plan.bookAhead },
    { icon: MapPinned, label: 'Signature experience', value: plan.signature },
  ];

  return (
    <section className="border-y border-[#e8eee9] bg-[#f4f7f5] px-4 py-8 md:px-6">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="font-serif text-[26px] font-medium italic text-[#343434] md:text-[30px]">
          Plan your {countryName} safari
        </h2>
        <p className="mt-1 max-w-3xl text-base leading-6 text-[#222]">
          Practical timing for {countryName} safaris, written for travellers comparing dates, permits, and trip length
          before they request a quote.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="rounded-2xl border border-[#dce6e0] bg-white px-4 py-4">
              <div className="mb-2 flex items-center gap-2 text-moss">
                <item.icon className="h-4 w-4" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#588048]">{item.label}</p>
              </div>
              <p className="text-sm leading-6 text-[#222]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
