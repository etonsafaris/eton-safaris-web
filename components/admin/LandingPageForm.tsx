'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import CoverImageField from '@/components/admin/CoverImageField';
import FaqEditor from '@/components/admin/FaqEditor';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SearchableSelect from '@/components/admin/SearchableSelect';
import SeoPanel from '@/components/admin/SeoPanel';
import { countrySlugFromLanding, landingCmsSlug, landingPreviewPath } from '@/lib/cms-routes';
import { landingConversionCopy } from '@/lib/landing-page-copy';
import { parseCmsPageExtras, type PageFaq } from '@/lib/cms-page-model';
import { faqsForEditor } from '@/lib/default-faqs';
import { ALL_SEEDED_COUNTRIES } from '@/lib/cms-defaults';
import { fetchCollectionRecordById, fetchCollectionRecords, getRecordTitle, pickRecordId, publishStampForSave, recordPublishedAt, slugify } from '@/lib/data';
import { embedContent, stripEmbeddedContent } from '@/lib/embedded-content';
import { defaultSeoValues, seoValuesFromRecord, type SeoValues } from '@/lib/seo';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';
import type { RecordRow } from '@/lib/types';

type LandingPageFormProps = {
  landingId?: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold text-[#374151]">{children}</label>;
}

function PillInput({
  value,
  onChange,
  required = false,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      placeholder={placeholder}
      className="w-full rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm text-[#111827] outline-none transition focus:border-[#66bb9a] focus:ring-2 focus:ring-[#66bb9a]/20"
    />
  );
}

export default function LandingPageForm({ landingId }: LandingPageFormProps) {
  const router = useRouter();
  const isEdit = Boolean(landingId);

  const [title, setTitle] = useState('');
  const [country, setCountry] = useState('');
  const [headline, setHeadline] = useState('');
  const [offerLine, setOfferLine] = useState('');
  const [readyHeading, setReadyHeading] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Request a Quote');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [faqs, setFaqs] = useState<PageFaq[]>([]);
  const [countries, setCountries] = useState<RecordRow[]>([]);
  const [seo, setSeo] = useState<SeoValues>(defaultSeoValues('country'));
  const [saving, setSaving] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');
  const [publishedAt, setPublishedAt] = useState('');

  useEffect(() => {
    fetchCollectionRecords('countries').then(setCountries);
  }, []);

  useEffect(() => {
    if (!landingId) return;
    fetchCollectionRecordById('landing_pages', landingId).then((landing) => {
      if (!landing) return;
      const extras = parseCmsPageExtras(landing);
      setTitle(String(landing.title || landing.name || ''));
      setCountry(String(landing.country || ''));
      setHeadline(extras.hero_title || String(landing.headline || landing.title || ''));
      setOfferLine(extras.offer_line);
      setReadyHeading(extras.ready_heading);
      setCtaLabel(extras.cta_label || 'Request a Quote');
      setExcerpt(extras.excerpt || String(landing.excerpt || landing.summary || ''));
      setContent(stripEmbeddedContent(String(landing.content || landing.description || '')));
      setFeaturedImage(String(landing.image_url || ''));
      setStatus(extras.status);
      setFaqs(faqsForEditor(landing, 'landing_pages'));
      setSeo(seoValuesFromRecord(landing as Record<string, unknown>));
      setPublishedAt(recordPublishedAt(landing) || extras.published_at);
    });
  }, [landingId]);

  const countryOptions = useMemo(() => {
    const fromDb = countries.map((row) => getRecordTitle(row)).filter(Boolean);
    const seeded = ALL_SEEDED_COUNTRIES.map((item) => item.name);
    return Array.from(new Set([...seeded, ...fromDb])).map((name) => ({ value: name, label: name }));
  }, [countries]);

  function applyCountry(value: string) {
    setCountry(value);
    const slug = landingCmsSlug(value);
    const copy = landingConversionCopy(countrySlugFromLanding(slug), value);
    setSeo((current) => ({
      ...current,
      slug: current.slug || slug,
      breadcrumb_title: current.breadcrumb_title || value,
      seo_title: current.seo_title || `${copy.h1} - Eton Safaris, Tour, Travel, Hotel Booking, Uganda`,
      meta_description: current.meta_description || copy.seoIntro.slice(0, 155),
      focus_keyphrase: current.focus_keyphrase || `${value} safaris`,
    }));
    if (!title) setTitle(copy.h1);
    if (!headline) setHeadline(copy.h1);
    if (!offerLine) setOfferLine(copy.offerLine);
    if (!readyHeading) setReadyHeading(copy.readyHeading);
    setFaqs((current) => (current.length ? current : copy.faqs));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const stamp = publishStampForSave(publishedAt, isEdit);
    const slug = seo.slug || landingCmsSlug(country || title) || slugify(title);

    const payload = buildSavePayload(
      'landing_pages',
      {
        title,
        slug,
        country,
        image_url: featuredImage.startsWith('blob:') ? '' : featuredImage,
        excerpt,
        headline,
        hero_title: headline,
        offer_line: offerLine,
        ready_heading: readyHeading,
        cta_label: ctaLabel,
        cta_href: '/request-a-quote',
        faqs: JSON.stringify(faqs),
        status,
        published_at: stamp,
        content: embedContent(content, {
          fields: {
            headline,
            excerpt,
            hero_title: headline,
            offer_line: offerLine,
            ready_heading: readyHeading,
            cta_label: ctaLabel,
            cta_href: '/request-a-quote',
            faqs: JSON.stringify(faqs),
            status,
            ...(stamp ? { published_at: stamp } : {}),
          },
        }),
      },
      { seo: { ...seo, slug, social_image_url: seo.social_image_url || featuredImage } }
    );

    const result = await saveWithColumnFallback('landing_pages', payload, isEdit ? landingId : undefined);
    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    await notifyAdminItemSaved({
      module: 'Landing Page',
      action: isEdit ? 'updated' : 'created',
      item: { ...payload, ...(result.data?.[0] || {}), id: isEdit ? landingId : result.data?.[0]?.id },
    });

    router.push('/admin/landing_pages');
    router.refresh();
  }

  return (
    <form id="landing-page-form" onSubmit={handleSubmit} className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/admin/landing_pages"
        className="mb-6 inline-block text-sm font-medium text-[#6b7280] hover:text-[#374151]"
      >
        &lt; Back to Landing Pages
      </Link>

      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
        <h1 className="text-center font-serif text-3xl font-bold text-[#111827]">
          {isEdit ? 'Edit Landing Page' : 'Add Landing Page'}
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[#6b7280]">
          Landing pages are admin conversion drafts. Guests who click a country always open the normal Destinations
          page. Preview below is signed-in only and is never linked from the public site.
        </p>
        {(seo.slug || country) && (
          <p className="mt-3 text-center text-sm">
            <a
              href={landingPreviewPath(seo.slug || country)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#00A651] hover:underline"
            >
              Preview conversion page (admin only) →
            </a>
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <FieldLabel>Landing title</FieldLabel>
            <PillInput
              value={title}
              onChange={(value) => {
                setTitle(value);
                setSeo((current) => ({
                  ...current,
                  seo_title: current.seo_title || value,
                  slug: current.slug || slugify(value),
                }));
              }}
              required
              placeholder="Uganda Safaris Tours and Gorilla Trekking"
            />
          </div>
          <div>
            <FieldLabel>Country</FieldLabel>
            <SearchableSelect
              value={country}
              onChange={applyCountry}
              options={countryOptions}
              placeholder="Select country"
            />
          </div>
        </div>

        <div className="mt-6">
          <FieldLabel>Hero headline (H1)</FieldLabel>
          <PillInput
            value={headline}
            onChange={setHeadline}
            placeholder="Uganda Gorilla Trekking Tours & Wildlife Safaris"
          />
        </div>

        <div className="mt-6">
          <FieldLabel>Offer line</FieldLabel>
          <PillInput
            value={offerLine}
            onChange={setOfferLine}
            placeholder="Available Gorilla Permits | 40% Off Discount | Local Based Operator"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <FieldLabel>Quote button label</FieldLabel>
            <PillInput value={ctaLabel} onChange={setCtaLabel} placeholder="Request a Quote" />
          </div>
          <div>
            <FieldLabel>Ready banner heading</FieldLabel>
            <PillInput
              value={readyHeading}
              onChange={setReadyHeading}
              placeholder="Are You Ready To Start Your Uganda Safari With Us ?"
            />
          </div>
        </div>

        <div className="mt-6">
          <FieldLabel>Excerpt</FieldLabel>
          <textarea
            value={excerpt}
            onChange={(event) => {
              setExcerpt(event.target.value);
              setSeo((current) => ({
                ...current,
                meta_description: current.meta_description || event.target.value.slice(0, 155),
              }));
            }}
            rows={3}
            className="w-full rounded-2xl border border-[#e5e7eb] px-5 py-3 text-sm outline-none focus:border-[#66bb9a]"
            placeholder="Short summary used for Google and social shares"
          />
        </div>

        <FaqEditor
          faqs={faqs}
          onChange={setFaqs}
          title="Landing FAQ"
          description="These are the same FAQs shown on the public page. Edit them here — they stay on the website."
        />

        <div className="mt-6">
          <FieldLabel>Landing article</FieldLabel>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="This article appears on the public country landing page."
            minHeight={320}
            showFooter
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <FieldLabel>Status</FieldLabel>
            <SearchableSelect
              value={status}
              onChange={(value) => setStatus(value === 'draft' ? 'draft' : 'published')}
              options={[
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
              ]}
              placeholder="Status"
            />
          </div>
          <CoverImageField
            className="lg:col-span-2"
            label="Hero image"
            folder="landing_pages"
            value={featuredImage}
            onChange={(url) => {
              setFeaturedImage(url);
              setSeo((current) => ({ ...current, social_image_url: url }));
            }}
          />
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        <div className="mt-10 flex justify-center border-t border-[#e5e7eb] pt-10">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#66bb9a] px-10 py-3 text-sm font-semibold text-white transition hover:bg-[#57a85b] disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Landing Page' : 'Create Landing Page'}
          </button>
        </div>
      </div>

      <SeoPanel
        className="mt-6"
        values={seo}
        onChange={setSeo}
        pageTitle={title}
        coverImageUrl={featuredImage.startsWith('blob:') ? '' : featuredImage}
        contentForReadability={`${headline}\n${excerpt}\n${content}`}
        onSave={() => setSeoSaved(true)}
        saving={saving}
        contentType="country"
        forceNoindex
        forceNoindexReason="Conversion landing — admin preview only; public site uses the country page."
        indexRecord={{
          title,
          name: title,
          image_url: featuredImage.startsWith('blob:') ? '' : featuredImage,
        }}
      />
      {seoSaved ? null : <p className="sr-only">SEO draft</p>}
    </form>
  );
}
