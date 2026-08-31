'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  applyTranslateLanguage,
  detectBrowserCountryIso,
  detectBrowserLanguageCode,
  filterLanguages,
  languageByCode,
  languagesForCountry,
  PAGE_SOURCE_LANGUAGE,
  readActiveTranslateLanguage,
  SITE_LANGUAGES,
  sortedCountryGroups,
  type SiteLanguage,
} from '@/lib/site-translate';

function LanguageButton({
  lang,
  active,
  onSelect,
}: {
  lang: SiteLanguage;
  active: boolean;
  onSelect: (code: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(lang.code)}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
        active ? 'bg-[#00A651] text-white' : 'text-[#222] hover:bg-[#f0fdf4]'
      }`}
    >
      <span className="font-medium">{lang.nativeName}</span>
      <span className={`text-xs ${active ? 'text-white/85' : 'text-[#666]'}`}>{lang.name}</span>
    </button>
  );
}

type SiteTranslatePanelProps = {
  open: boolean;
  onClose: () => void;
  anchor?: 'fab' | 'header';
};

export default function SiteTranslatePanel({ open, onClose, anchor = 'fab' }: SiteTranslatePanelProps) {
  const [query, setQuery] = useState('');
  const [countryIso, setCountryIso] = useState('');
  const [expandAll, setExpandAll] = useState(false);
  const [activeCode, setActiveCode] = useState(PAGE_SOURCE_LANGUAGE);

  const countries = useMemo(() => sortedCountryGroups(), []);

  useEffect(() => {
    setActiveCode(readActiveTranslateLanguage());
  }, [open]);

  useEffect(() => {
    if (!open || countryIso) return;
    const detected = detectBrowserCountryIso();
    if (detected) setCountryIso(detected);
  }, [open, countryIso]);

  const browserLang = useMemo(() => detectBrowserLanguageCode(), []);
  const browserLanguage = languageByCode(browserLang);
  const countryLanguages = useMemo(() => (countryIso ? languagesForCountry(countryIso) : []), [countryIso]);
  const filteredLanguages = useMemo(() => filterLanguages(query), [query]);
  const showAllLanguages = expandAll || !countryIso || Boolean(query.trim());
  const activeLabel = languageByCode(activeCode)?.nativeName || 'English';
  const countryName = countries.find((group) => group.iso2 === countryIso)?.country;

  function selectLanguage(code: string) {
    onClose();
    if (code === activeCode) return;
    applyTranslateLanguage(code);
  }

  if (!open) return null;

  return (
    <div
      className={`site-translate-panel site-translate-panel--${anchor}`}
      role="dialog"
      aria-label="Translate this page"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[#e5e7eb] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#111]">Translate page</p>
          <p className="mt-0.5 text-xs text-[#666]">
            Current: <span className="font-medium text-[#00A651]">{activeLabel}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-[#666] hover:bg-[#f3f4f6]"
          aria-label="Close translate menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-4 py-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-[#666]">Your country</label>
        <select
          value={countryIso}
          onChange={(event) => {
            setCountryIso(event.target.value);
            setExpandAll(false);
          }}
          className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20"
        >
          <option value="">All countries</option>
          {countries.map((group) => (
            <option key={group.iso2} value={group.iso2}>
              {group.country}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search all ${SITE_LANGUAGES.length} languages…`}
            className="w-full rounded-lg border border-[#e5e7eb] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20"
          />
        </div>
      </div>

      <div className="max-h-[min(50vh,360px)] overflow-y-auto px-2 pb-3">
        <button
          type="button"
          onClick={() => selectLanguage(PAGE_SOURCE_LANGUAGE)}
          className={`mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${
            activeCode === PAGE_SOURCE_LANGUAGE ? 'bg-[#00A651] text-white' : 'text-[#222] hover:bg-[#f0fdf4]'
          }`}
        >
          <span className="font-medium">English (original)</span>
          <span className={`text-xs ${activeCode === PAGE_SOURCE_LANGUAGE ? 'text-white/85' : 'text-[#666]'}`}>
            Reset
          </span>
        </button>

        {!query.trim() && browserLanguage && browserLanguage.code !== PAGE_SOURCE_LANGUAGE ? (
          <div className="mb-3 px-1">
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-[#888]">Suggested</p>
            <LanguageButton
              lang={browserLanguage}
              active={activeCode === browserLanguage.code}
              onSelect={selectLanguage}
            />
          </div>
        ) : null}

        {!query.trim() && countryLanguages.length > 0 ? (
          <div className="mb-3 px-1">
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-[#888]">
              Languages for {countryName}
            </p>
            {countryLanguages.map((lang) => (
              <LanguageButton
                key={`country-${lang.code}`}
                lang={lang}
                active={activeCode === lang.code}
                onSelect={selectLanguage}
              />
            ))}
          </div>
        ) : null}

        {showAllLanguages ? (
          <div className="px-1">
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-[#888]">
              {query.trim() ? 'Search results' : `All languages (${SITE_LANGUAGES.length})`}
            </p>
            {filteredLanguages
              .filter((lang) => lang.code !== PAGE_SOURCE_LANGUAGE)
              .map((lang) => (
                <LanguageButton
                  key={lang.code}
                  lang={lang}
                  active={activeCode === lang.code}
                  onSelect={selectLanguage}
                />
              ))}
            {filteredLanguages.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-[#666]">No languages match your search.</p>
            ) : null}
          </div>
        ) : (
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => setExpandAll(true)}
              className="text-sm font-medium text-[#00A651] hover:underline"
            >
              Browse all {SITE_LANGUAGES.length} languages
            </button>
          </div>
        )}
      </div>

      <p className="border-t border-[#e5e7eb] px-4 py-2 text-[10px] leading-relaxed text-[#888]">
        Translation is provided by Google Translate. Layout and names may vary slightly by language.
      </p>
    </div>
  );
}
