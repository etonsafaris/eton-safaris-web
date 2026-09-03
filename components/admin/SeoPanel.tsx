'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Circle, Info, X } from 'lucide-react';
import KeywordTagBox from '@/components/admin/KeywordTagBox';
import SearchableSelect from '@/components/admin/SearchableSelect';
import { NAV_COUNTRIES, OTHER_DESTINATIONS, SITE_LOGO } from '@/lib/collections';
import { clearCollectionCache, fetchCollectionRecords, pickString, slugify } from '@/lib/data';
import { chipsFromKeywordRows, keywordRowMatchesScope } from '@/lib/keywords';
import {
  analyzeReadability,
  analyzeSeo,
  buildDefaultJsonLd,
  CONTENT_SCHEMA_DEFAULTS,
  fleschReadingEase,
  ROBOTS_ADVANCED_OPTIONS,
  SEO_SCHEMA_TYPES,
  seoScore,
  seoScorePercent,
  validateSeoSchema,
  type SeoContentType,
  type SeoValues,
  seoValuesFromRecord,
} from '@/lib/seo';
import { IndexStatusBadge, indexStatusForDraft, seoContentTypeToIndexKind } from '@/components/admin/IndexStatusBadge';
import GoogleIndexToggle from '@/components/admin/GoogleIndexToggle';
import type { RecordRow } from '@/lib/types';

type SeoPanelProps = {
  values: SeoValues;
  onChange: (values: SeoValues) => void;
  pageTitle?: string;
  contentForReadability?: string;
  siteName?: string;
  siteUrl?: string;
  onSave?: () => void;
  saving?: boolean;
  className?: string;
  coverImageUrl?: string;
  contentType?: SeoContentType;
  keywordLibraryCountry?: string;
  keywordLibraryCategory?: string;
  indexRecord?: RecordRow | null;
  forceNoindex?: boolean;
  forceNoindexReason?: string;
  googleIndexCollectionId?: string;
  googleIndexRecord?: RecordRow | null;
  onGoogleIndexUpdated?: (record: RecordRow) => void;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-semibold text-[#374151]">{children}</label>;
}

function TextInput({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 ${className}`}
    />
  );
}

function qualityTone(length: number, min: number, ideal: number, max: number) {
  if (length === 0 || length < min) return 'bg-gray-300';
  if (length > max) return 'bg-red-500';
  if (length >= ideal) return 'bg-[#00A651]';
  return 'bg-[#00A651]/70';
}

function CharacterBar({
  length,
  min,
  ideal,
  max,
}: {
  length: number;
  min: number;
  ideal: number;
  max: number;
}) {
  const width = Math.min(100, Math.round((length / max) * 100));
  return (
    <div className="mt-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full transition-all ${qualityTone(length, min, ideal, max)}`} style={{ width: `${width}%` }} />
      </div>
      <p className="mt-1 text-xs text-[#6b7280]">{length}/{max} characters</p>
    </div>
  );
}

export default function SeoPanel({
  values,
  onChange,
  pageTitle = '',
  contentForReadability = '',
  siteName = 'Eton Safaris',
  siteUrl = 'etonsafaris.com',
  onSave,
  saving = false,
  className = '',
  coverImageUrl = '',
  contentType = 'page',
  keywordLibraryCountry = '',
  keywordLibraryCategory = '',
  indexRecord = null,
  forceNoindex = false,
  forceNoindexReason = '',
  googleIndexCollectionId = '',
  googleIndexRecord = null,
  onGoogleIndexUpdated,
}: SeoPanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'seo' | 'readability' | 'schema'>('seo');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keywordCountry, setKeywordCountry] = useState(keywordLibraryCountry || 'Uganda');
  const [keywordCategory, setKeywordCategory] = useState(keywordLibraryCategory || '');
  const [libraryCategories, setLibraryCategories] = useState<{ value: string; label: string }[]>([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (keywordLibraryCountry) setKeywordCountry(keywordLibraryCountry);
  }, [keywordLibraryCountry]);

  useEffect(() => {
    if (keywordLibraryCategory) setKeywordCategory(keywordLibraryCategory);
  }, [keywordLibraryCategory]);

  const analysis = useMemo(
    () => analyzeSeo(values, contentForReadability),
    [values, contentForReadability]
  );
  const score = seoScore(values, contentForReadability);
  const scorePercent = seoScorePercent(values, contentForReadability);
  const readability = useMemo(() => analyzeReadability(contentForReadability), [contentForReadability]);
  const flesch = useMemo(() => fleschReadingEase(contentForReadability), [contentForReadability]);
  const schemaCheck = useMemo(() => validateSeoSchema(values.seo_schema), [values.seo_schema]);
  const indexKind = seoContentTypeToIndexKind(contentType);
  const indexStatus = useMemo(() => {
    if (!indexKind) return null;
    return indexStatusForDraft(indexKind, {
      baseRecord: indexRecord,
      title: pageTitle,
      description: contentForReadability,
      imageUrl: coverImageUrl,
      country: pickString(indexRecord || {}, ['country']),
      robotsIndex: values.robots_index,
      metaDescription: values.meta_description,
      forceNoindex,
      forceNoindexReason,
    });
  }, [
    indexKind,
    indexRecord,
    pageTitle,
    contentForReadability,
    coverImageUrl,
    values.robots_index,
    values.meta_description,
    forceNoindex,
    forceNoindexReason,
  ]);

  const previewTitle = values.seo_title.trim() || 'Please provide a meta title';
  const previewDescription =
    values.meta_description.trim() ||
    'Please provide a meta description by editing the snippet below.';
  const previewSlug = values.slug.trim() || 'page-slug';

  function update<K extends keyof SeoValues>(key: K, value: SeoValues[K]) {
    if (key === 'seo_title' && typeof value === 'string') {
      onChange({ ...values, seo_title: value, slug: slugify(value) });
      return;
    }
    onChange({ ...values, [key]: value });
  }

  function addKeyword() {
    const incoming = values.focus_keywords.concat(
      keywordDraft
        .split(/[,;\n]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    );
    const next: string[] = [];
    for (const keyword of incoming) {
      if (!next.some((item) => item.toLowerCase() === keyword.toLowerCase())) {
        next.push(keyword);
      }
    }
    if (next.length === values.focus_keywords.length) {
      setKeywordDraft('');
      return;
    }
    update('focus_keywords', next);
    setKeywordDraft('');
  }

  function removeKeyword(keyword: string) {
    update(
      'focus_keywords',
      values.focus_keywords.filter((item) => item !== keyword)
    );
  }

  useEffect(() => {
    fetchCollectionRecords('categories')
      .then((rows) => {
        setLibraryCategories(
          rows
            .filter((row) => {
              const value = pickString(row, ['country']);
              return !value || value.toLowerCase() === keywordCountry.toLowerCase();
            })
            .map((row) => ({
              value: pickString(row, ['title', 'name']),
              label: pickString(row, ['title', 'name']),
            }))
            .filter((item) => item.value)
        );
      })
      .catch((error) => console.error(error));
  }, [keywordCountry]);

  useEffect(() => {
    if (!keywordCategory) return;
    clearCollectionCache('keywords');
    fetchCollectionRecords('keywords', ['keyword', 'seo_keywords'])
      .then((rows) => {
        const matched = chipsFromKeywordRows(
          rows.filter((row) => {
            return keywordRowMatchesScope(row, keywordCountry, keywordCategory);
          })
        );
        if (matched.length > 0) onChange({ ...values, focus_keywords: matched });
      })
      .catch((error) => console.error('[SEO] Keyword library load failed:', error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywordCountry, keywordCategory]);

  const socialImageUrl =
    coverImageUrl && !coverImageUrl.startsWith('blob:') && !coverImageUrl.startsWith('data:')
      ? coverImageUrl
      : values.social_image_url;

  useEffect(() => {
    if (!socialImageUrl || values.social_image_url === socialImageUrl) return;
    onChange({ ...values, social_image_url: socialImageUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socialImageUrl]);

  function handleSave() {
    onSave?.();
    setToast('SEO saved successful');
    window.setTimeout(() => setToast(''), 2500);
  }

  function generateSchema() {
    const siteHost = siteUrl.replace(/^https?:\/\//, '');
    const json = buildDefaultJsonLd(
      { ...values, schema_type: values.schema_type || CONTENT_SCHEMA_DEFAULTS[contentType] },
      {
        title: pageTitle || values.seo_title || 'Untitled',
        description: values.meta_description,
        url: values.canonical_url || `https://${siteHost}/${values.slug || 'page'}`,
        image: socialImageUrl,
        siteName,
        siteUrl: `https://${siteHost}`,
      }
    );
    update('seo_schema', JSON.stringify(json, null, 2));
  }

  useEffect(() => {
    if (pageTitle && !values.seo_title) {
      onChange({ ...values, seo_title: pageTitle, slug: values.slug || slugify(pageTitle) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageTitle]);

  useEffect(() => {
    if (!values.meta_description && contentForReadability) {
      const text = contentForReadability.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155);
      if (text) onChange({ ...values, meta_description: text });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentForReadability]);

  return (
    <div className={className}>
      <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-white px-5 py-4 text-left shadow-sm">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-3 text-left"
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              scorePercent >= 90 ? 'bg-green-100 text-green-700' : scorePercent >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {scorePercent}
          </span>
          <div>
            <span className="font-bold text-[#111827]">SEO</span>
            <span className="ml-2 text-sm text-[#6b7280]">{scorePercent}% {score === 'good' ? 'optimized' : 'needs work'}</span>
          </div>
          {indexStatus ? <IndexStatusBadge status={indexStatus} size="md" /> : null}
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {googleIndexCollectionId && googleIndexRecord ? (
            <GoogleIndexToggle
              collectionId={googleIndexCollectionId}
              record={{ ...googleIndexRecord, robots_index: values.robots_index }}
              onUpdated={(record) => {
                onChange({ ...values, robots_index: seoValuesFromRecord(record).robots_index });
                onGoogleIndexUpdated?.(record);
              }}
            />
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? 'Collapse SEO panel' : 'Expand SEO panel'}
            className="rounded p-1 text-[#6b7280] hover:bg-[#f3f4f6]"
          >
            <ChevronDown className={`h-5 w-5 transition ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-2 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
          {indexStatus ? (
            <p className="border-b border-[#e5e7eb] bg-[#f8fafc] px-4 py-2.5 text-xs text-[#475569]">
              Google: <strong>{indexStatus.label}</strong> — {indexStatus.reason}
            </p>
          ) : null}
          <div className="flex border-b border-[#e5e7eb] px-4">
            {(['seo', 'readability', 'schema'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`px-4 py-3 text-sm font-medium capitalize transition ${
                  tab === item
                    ? 'border-b-2 border-[#00A651] text-[#111827]'
                    : 'text-[#6b7280] hover:text-[#111827]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="space-y-6 p-6">
            {tab === 'seo' && (
              <>
                <div>
                  <FieldLabel>Focus Keyphrase</FieldLabel>
                  <div className="relative">
                    <input
                      value={values.focus_keyphrase}
                      onChange={(event) => update('focus_keyphrase', event.target.value)}
                      placeholder="e.g. Luxury Safari"
                      className="w-full rounded-lg border border-[#e5e7eb] px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20"
                    />
                    <Info className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                  </div>
                  <p className="mt-1.5 text-xs text-[#6b7280]">
                    The main keyword you want this page to rank for.
                  </p>
                </div>

                <div className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-4 w-1 rounded-full bg-[#00A651]" />
                    <p className="text-sm font-semibold text-[#111827]">Google Preview</p>
                  </div>
                  <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
                    <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                      <img src={SITE_LOGO} alt="" className="h-5 w-5 object-contain" />
                      <span>
                        {siteName} · {siteUrl} › {previewSlug}
                      </span>
                    </div>
                    <p className="mt-2 text-xl text-[#1a0dab]">{previewTitle}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#4b5563]">{previewDescription}</p>
                  </div>
                </div>

                <div>
                  <FieldLabel>SEO Title</FieldLabel>
                  <TextInput
                    value={values.seo_title}
                    onChange={(value) => update('seo_title', value)}
                    placeholder="Type meta title here"
                  />
                  <CharacterBar length={values.seo_title.length} min={30} ideal={50} max={60} />
                </div>

                <div>
                  <FieldLabel>Slug</FieldLabel>
                  <TextInput
                    value={values.slug}
                    onChange={() => undefined}
                    placeholder="generated-from-seo-title"
                    className="bg-[#f9fafb] text-[#6b7280]"
                  />
                  <p className="mt-1.5 text-xs leading-relaxed text-[#6b7280]">
                    The slug is generated from the SEO title and stays locked to that value.
                  </p>
                </div>

                <div>
                  <FieldLabel>Meta Description</FieldLabel>
                  <textarea
                    value={values.meta_description}
                    onChange={(event) => update('meta_description', event.target.value)}
                    rows={4}
                    placeholder="Modify your meta description here"
                    className="w-full resize-y rounded-lg border border-[#e5e7eb] px-3.5 py-3 text-sm outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20"
                  />
                  <CharacterBar length={values.meta_description.length} min={70} ideal={120} max={160} />
                </div>

                <div>
                  <FieldLabel>Social Image URL</FieldLabel>
                  <TextInput
                    value={socialImageUrl}
                    onChange={(value) => update('social_image_url', value)}
                    placeholder="Filled automatically from the cover image above"
                    className={coverImageUrl ? 'bg-[#f9fafb]' : ''}
                  />
                  {socialImageUrl ? (
                    <div className="mt-3 overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#fafafa]">
                      <img src={socialImageUrl} alt="" className="h-36 w-full object-cover" />
                    </div>
                  ) : null}
                  <p className="mt-1.5 text-xs text-[#6b7280]">
                    This URL is taken automatically from the image uploaded above.
                  </p>
                </div>

                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <FieldLabel>Focus Keyword Tags</FieldLabel>
                    <div className="flex w-full max-w-sm gap-2">
                      <SearchableSelect
                        value={keywordCountry}
                        onChange={(value) => {
                          setKeywordCountry(value);
                          setKeywordCategory('');
                        }}
                        options={[...NAV_COUNTRIES, ...OTHER_DESTINATIONS].map((item) => ({
                          value: item.name,
                          label: item.name,
                        }))}
                        placeholder="Country"
                      />
                      <SearchableSelect
                        value={keywordCategory}
                        onChange={setKeywordCategory}
                        options={libraryCategories}
                        placeholder="Category"
                      />
                    </div>
                  </div>
                  <KeywordTagBox
                    tags={values.focus_keywords}
                    draft={keywordDraft}
                    onDraftChange={setKeywordDraft}
                    onAdd={addKeyword}
                    onEdit={(keyword) => {
                      removeKeyword(keyword);
                      setKeywordDraft(keyword);
                    }}
                    onRemove={removeKeyword}
                    placeholder="Type a keyword and press Enter"
                    minHeightClass="min-h-[88px]"
                  />
                  <p className="mt-1.5 text-xs text-[#6b7280]">
                    Select a country and category to load every keyword saved for that pair. You can still type more and press Enter.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAdvancedOpen((current) => !current)}
                  className="flex w-full items-center justify-between rounded-lg border border-[#e5e7eb] px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#374151]">
                    <Circle className="h-2 w-2 fill-[#9ca3af] text-[#9ca3af]" />
                    Advanced SEO
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-[#6b7280] transition ${advancedOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {advancedOpen && (
                  <div className="space-y-4 rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-4">
                    <div>
                      <FieldLabel>Allow search engines to show this page in search results?</FieldLabel>
                      <SearchableSelect
                        value={values.robots_index ? 'yes' : 'no'}
                        onChange={(value) => update('robots_index', value === 'yes')}
                        options={[
                          { value: 'yes', label: 'Yes (index)' },
                          { value: 'no', label: 'No (noindex)' },
                        ]}
                      />
                    </div>
                    <div>
                      <FieldLabel>Should search engines follow links on this page?</FieldLabel>
                      <SearchableSelect
                        value={values.robots_follow ? 'yes' : 'no'}
                        onChange={(value) => update('robots_follow', value === 'yes')}
                        options={[
                          { value: 'yes', label: 'Yes (follow)' },
                          { value: 'no', label: 'No (nofollow)' },
                        ]}
                      />
                    </div>
                    <div>
                      <FieldLabel>Meta robots advanced</FieldLabel>
                      <div className="space-y-2">
                        {ROBOTS_ADVANCED_OPTIONS.map((option) => (
                          <label key={option.value} className="flex items-center gap-2 text-sm text-[#374151]">
                            <input
                              type="checkbox"
                              checked={values.robots_advanced.includes(option.value)}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...values.robots_advanced, option.value]
                                  : values.robots_advanced.filter((item) => item !== option.value);
                                update('robots_advanced', next);
                              }}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Breadcrumbs Title</FieldLabel>
                      <TextInput
                        value={values.breadcrumb_title}
                        onChange={(value) => update('breadcrumb_title', value)}
                        placeholder={values.seo_title || pageTitle || 'Shown in breadcrumb schema'}
                      />
                    </div>
                    <div>
                      <FieldLabel>Canonical URL</FieldLabel>
                      <TextInput
                        value={values.canonical_url}
                        onChange={(value) => update('canonical_url', value)}
                        placeholder={`https://${siteUrl.replace(/^https?:\/\//, '')}/${values.slug || 'your-page'}`}
                      />
                      <p className="mt-1.5 text-xs text-[#6b7280]">
                        Leave empty to use the page’s own URL. Set this if the same content lives at another address.
                      </p>
                    </div>
                    <div>
                      <FieldLabel>Open Graph Title</FieldLabel>
                      <TextInput
                        value={values.og_title}
                        onChange={(value) => update('og_title', value)}
                        placeholder={values.seo_title || 'Defaults to the SEO title'}
                      />
                    </div>
                    <div>
                      <FieldLabel>Open Graph Description</FieldLabel>
                      <textarea
                        value={values.og_description}
                        onChange={(event) => update('og_description', event.target.value)}
                        rows={3}
                        placeholder={values.meta_description || 'Defaults to the meta description'}
                        className="w-full resize-y rounded-lg border border-[#e5e7eb] px-3.5 py-3 text-sm outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-4 w-1 rounded-full bg-orange-400" />
                    <p className="text-sm font-semibold text-[#111827]">SEO Analysis results</p>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {analysis.map((item) => (
                      <li
                        key={item.message}
                        className={`flex items-start gap-2 ${
                          item.type === 'error'
                            ? 'text-red-600'
                            : item.type === 'info'
                              ? 'text-[#374151]'
                              : 'text-green-700'
                        }`}
                      >
                        {item.type === 'error' ? (
                          <X className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : item.type === 'ok' ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                          <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        {item.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {tab === 'readability' && (
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <FieldLabel>Readability analysis</FieldLabel>
                    <p className="text-sm text-[#6b7280]">
                      Reviewing: {pageTitle || values.seo_title || 'Untitled item'}
                    </p>
                  </div>
                  <div className="rounded-full bg-[#ecfdf5] px-3 py-1 text-sm font-semibold text-[#047857]">
                    Flesch {flesch || 0}
                  </div>
                </div>
                <ul className="space-y-2 text-sm">
                  {readability.map((item) => (
                    <li
                      key={item.message}
                      className={`flex items-start gap-2 ${
                        item.type === 'error' ? 'text-red-600' : item.type === 'ok' ? 'text-green-700' : 'text-[#374151]'
                      }`}
                    >
                      {item.type === 'error' ? (
                        <X className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : item.type === 'ok' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === 'schema' && (
              <div className="space-y-4">
                <div>
                  <FieldLabel>Schema type</FieldLabel>
                  <SearchableSelect
                    value={values.schema_type}
                    onChange={(value) => update('schema_type', value as SeoValues['schema_type'])}
                    options={SEO_SCHEMA_TYPES.map((item) => ({ value: item.value, label: item.label }))}
                    placeholder="Select schema type"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateSchema}
                  className="rounded-lg border border-[#00A651] px-4 py-2 text-sm font-semibold text-[#00A651] hover:bg-[#f0fdf4]"
                >
                  Generate schema from this page
                </button>
                <div>
                  <FieldLabel>Schema markup (JSON-LD)</FieldLabel>
                  <textarea
                    value={values.seo_schema}
                    onChange={(event) => update('seo_schema', event.target.value)}
                    rows={12}
                    placeholder='{"@context":"https://schema.org","@type":"TouristTrip","name":"..."}'
                    className="w-full rounded-lg border border-[#e5e7eb] px-3.5 py-3 font-mono text-xs outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20"
                  />
                  <p className={`mt-2 text-xs ${schemaCheck.ok ? 'text-[#047857]' : 'text-red-600'}`}>
                    {schemaCheck.message}
                  </p>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    This JSON-LD is output on the public page. If you leave it empty, a graph is generated automatically
                    (Organization, WebSite, BreadcrumbList, plus this page type).
                  </p>
                </div>
              </div>
            )}

            {onSave && (
              <div className="flex items-center justify-between border-t border-[#e5e7eb] pt-4">
                {toast ? <p className="text-sm font-medium text-[#00A651]">{toast}</p> : <span />}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-[#00A651] px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#00945a] disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'SAVE SEO'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
