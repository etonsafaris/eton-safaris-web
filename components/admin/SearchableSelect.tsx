'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type Option = { value: string; label: string };

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  onQueryChange,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  onQueryChange?: (query: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle));
  }, [options, query]);

  const selected = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        className={`flex w-full items-center justify-between rounded-lg border bg-white px-3.5 py-2.5 text-left text-sm outline-none dark:border-white/10 dark:bg-[#161b22] ${
          disabled
            ? 'cursor-not-allowed border-[#e5e7eb] bg-[#f9fafb] text-[#9ca3af] dark:bg-white/5 dark:text-gray-500'
            : open
              ? 'border-[#00A651] ring-2 ring-[#00A651]/20'
              : 'border-[#e5e7eb] text-[#111827] hover:border-[#d1d5db] dark:text-white dark:hover:border-white/20'
        }`}
      >
        <span className={selected ? 'text-[#111827] dark:text-white' : 'text-[#9ca3af] dark:text-gray-500'}>
          {selected?.label || value || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#9ca3af] dark:text-gray-400 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <>
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-lg dark:border-white/10 dark:bg-[#161b22]">
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                onQueryChange?.(event.target.value);
              }}
              placeholder="Type to search…"
              className="w-full border-b border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none dark:border-white/10 dark:bg-[#161b22] dark:text-white dark:placeholder:text-gray-500"
            />
            <div className="max-h-56 overflow-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No matches</p>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setQuery('');
                      setOpen(false);
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-cream dark:hover:bg-white/10 ${
                      option.value === value
                        ? 'bg-moss/10 text-moss dark:bg-emerald-500/20 dark:text-emerald-400'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
          <button type="button" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} aria-label="Close" />
        </>
      )}
    </div>
  );
}
