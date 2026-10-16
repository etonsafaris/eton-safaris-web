'use client';

import { ChevronDown } from 'lucide-react';
import { publicBodyHtml } from '@/lib/embedded-content';
import PublicHtml from '@/components/public/PublicHtml';
import { stripPublicMoney } from '@/lib/public-money';
import type { ItineraryDay } from '@/lib/itinerary';

export default function TourItinerary({ days }: { days?: ItineraryDay[] | null }) {
  const safeDays = Array.isArray(days) ? days.filter(Boolean) : [];
  if (!safeDays.length) return null;

  return (
    <div id="itinerary" className="scroll-mt-24">
      <h2 className="content-subheading">
        Itinerary in details
      </h2>
      <div className="space-y-4">
        {safeDays.map((day, index) => {
          try {
          const dayNumber = Number.parseInt(String(day?.day ?? ''), 10);
          const displayDay = Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : index + 1;
          const title = stripPublicMoney(day?.title || `Day ${displayDay}`);
          const meals = stripPublicMoney(day?.mealPlan || day?.meal_plan || '');
          const stay = stripPublicMoney(day?.accommodationPlan || day?.accommodation_plan || '');
          return (
            <details key={`${displayDay}-${title}-${index}`} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-[#00A651] text-white">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em]">Day</span>
                  <span className="text-lg font-bold leading-none">{displayDay}</span>
                </span>
                <span className="flex min-h-[52px] flex-1 items-center rounded-lg bg-[#ececec] px-4 py-3 font-semibold text-[#111]">
                  {title}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition group-open:rotate-180" />
              </summary>
              <div
                className="ml-0 mt-3 border-l-2 border-[#00A651]/30 pl-4 sm:ml-[68px]"
                style={{ fontFamily: 'system-ui, -apple-system, Roboto, "Helvetica Neue", sans-serif', textAlign: 'justify' }}
              >
                {day?.description ? (
                  <PublicHtml className="public-prose max-w-none" html={publicBodyHtml(day.description)} />
                ) : (
                  <p className="public-prose">Details for this day will be shared with your itinerary.</p>
                )}
                {meals ? (
                  <p className="mt-3 text-sm">
                    <strong>Meal Plan:</strong> {meals}
                  </p>
                ) : null}
                {stay ? (
                  <p className="mt-1 text-sm">
                    <strong>Accommodation:</strong> {stay}
                  </p>
                ) : null}
              </div>
            </details>
          );
          } catch {
            return null;
          }
        })}
      </div>
    </div>
  );
}
