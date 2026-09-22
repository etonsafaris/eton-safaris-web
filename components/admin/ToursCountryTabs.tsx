'use client';

import SearchableSelect from '@/components/admin/SearchableSelect';
import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';

type ToursCountryTabsProps = {
  value: string;
  onChange: (countryName: string) => void;
};

function Flag({ iso, name }: { iso: string; name: string }) {
  if (!iso) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={name}
      className="h-3.5 w-5 rounded-sm object-cover"
      loading="lazy"
    />
  );
}

/** Dav-style destination chips: East Africa tabs + “Other destinations” select. */
export default function ToursCountryTabs({ value, onChange }: ToursCountryTabsProps) {
  const primaryNames = new Set(NAV_COUNTRIES.map((item) => item.name));
  const otherValue = value && !primaryNames.has(value) ? value : '';

  return (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {NAV_COUNTRIES.map((destination) => {
          const active = value === destination.name;
          return (
            <button
              key={destination.slug}
              type="button"
              onClick={() => onChange(destination.name)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'border-[#00A651] bg-[#00A651] text-white shadow-sm'
                  : 'border-[#e5e7eb] bg-white text-[#374151] hover:border-[#00A651]/40 hover:bg-[#f0fdf4] dark:border-white/10 dark:bg-[#0a0c10] dark:text-gray-200'
              }`}
            >
              <Flag iso={destination.iso} name={destination.name} />
              {destination.name}
            </button>
          );
        })}
      </div>
      <div className="w-full sm:max-w-xs">
        <SearchableSelect
          value={otherValue}
          onChange={onChange}
          options={[
            { value: '', label: 'Other destinations…' },
            ...OTHER_DESTINATIONS.map((item) => ({ value: item.name, label: item.name })),
          ]}
          placeholder="Other destinations"
        />
      </div>
    </div>
  );
}
