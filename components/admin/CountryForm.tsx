'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAdminCollectionListHref } from '@/lib/use-admin-list-href';
import CoverImageField from '@/components/admin/CoverImageField';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SeoPanel from '@/components/admin/SeoPanel';
import { parseCmsPageExtras, serializeFaqs, faqRowsForStorage, type PageFaq } from '@/lib/cms-page-model';
import { faqsForEditor } from '@/lib/default-faqs';
import { fetchCollectionRecordById, pickRecordId, publishStampForSave, recordPublishedAt, slugify } from '@/lib/data';
import { embedContent, stripEmbeddedContent } from '@/lib/embedded-content';
import { isLocalOnlyImage } from '@/lib/public-image';
import {
  defaultSeoValues,
  seoValuesFromRecord,
  type SeoValues,
} from '@/lib/seo';
import { buildSavePayload } from '@/lib/supabase-payload';
import { readAdminEditPrefill } from '@/lib/admin-edit-prefill';
import { saveWithColumnFallback } from '@/lib/admin-records-client';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';

type CountryFormProps = {
  countryId?: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-medium text-[#374151] dark:text-gray-200">{children}</label>
  );
}

export default function CountryForm(props: CountryFormProps) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading form…</p>}>
      <CountryFormInner {...props} />
    </Suspense>
  );
}

function CountryFormInner({ countryId }: CountryFormProps) {
  const listHref = useAdminCollectionListHref('countries');
  const router = useRouter();
  const isEdit = Boolean(countryId);

  const prefillRow = countryId ? readAdminEditPrefill('countries', countryId) : null;
  const [name, setName] = useState(() => String(prefillRow?.name || ''));
  const [headline, setHeadline] = useState(() => String(prefillRow?.tagline || prefillRow?.headline || ''));
  const [bestTimeToVisit, setBestTimeToVisit] = useState(() =>
    prefillRow
      ? parseCmsPageExtras(prefillRow, String(prefillRow.slug || '')).best_time_to_visit ||
        String(prefillRow.best_time_to_visit || prefillRow.best_time || '')
      : ''
  );
  const [description, setDescription] = useState(() =>
    prefillRow ? stripEmbeddedContent(String(prefillRow.description || '')) : ''
  );
  const [summary, setSummary] = useState(() => String(prefillRow?.summary || prefillRow?.excerpt || ''));
  const [faqs, setFaqs] = useState<PageFaq[]>(() => (prefillRow ? faqsForEditor(prefillRow, 'countries') : []));
  const [featuredImage, setFeaturedImage] = useState(() => String(prefillRow?.image_url || ''));
  const [publishedAt, setPublishedAt] = useState(() => (prefillRow ? recordPublishedAt(prefillRow) : ''));
  const [seo, setSeo] = useState<SeoValues>(() =>
    prefillRow ? seoValuesFromRecord(prefillRow as Record<string, unknown>) : defaultSeoValues('country')
  );
  const [saving, setSaving] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!countryId) return;
    fetchCollectionRecordById('countries', countryId).then((country) => {
      if (!country) return;

      setName(String(country.name || ''));
      setHeadline(String(country.tagline || country.headline || ''));
      setBestTimeToVisit(
        parseCmsPageExtras(country, String(country.slug || '')).best_time_to_visit ||
          String(country.best_time_to_visit || country.best_time || '')
      );
      setDescription(stripEmbeddedContent(String(country.description || '')));
      setSummary(String(country.summary || country.excerpt || ''));
      setFaqs(faqsForEditor(country, 'countries'));
      setFeaturedImage(String(country.image_url || ''));
      setPublishedAt(recordPublishedAt(country));
      setSeo(seoValuesFromRecord(country as Record<string, unknown>));
    });
  }, [countryId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const imageUrl = featuredImage.startsWith('blob:') ? '' : featuredImage;
    if (
      typeof window !== 'undefined' &&
      !/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname) &&
      imageUrl &&
      isLocalOnlyImage(imageUrl)
    ) {
      setError(
        'That cover image is only stored on this computer, so the public website cannot show it. Upload the image again so it is saved to cloud storage, then save.'
      );
      setSaving(false);
      return;
    }

    const packedFaqs = serializeFaqs(faqs);
    const stamp = publishStampForSave(publishedAt, isEdit);
    const payload = buildSavePayload(
      'countries',
      {
        name,
        tagline: headline,
        headline,
        hero_title: headline,
        best_time_to_visit: bestTimeToVisit.trim(),
        description: embedContent(description, {
          fields: {
            faqs: packedFaqs,
            best_time_to_visit: bestTimeToVisit.trim(),
            published_at: stamp,
            hero_title: headline.trim(),
            headline: headline.trim(),
          },
        }),
        summary,
        faqs: packedFaqs,
        post_blocks: packedFaqs,
        image_url: imageUrl,
        slug: (seo.slug && slugify(seo.slug).length >= 3 ? slugify(seo.slug) : '') || slugify(name),
        status: 'Published',
        // Keep the original publish date when present; stamp legacy rows that never had one.
        published_at: stamp,
      },
      { seo }
    );

    try {
      const result = await saveWithColumnFallback('countries', payload, isEdit ? countryId : undefined);

      if (result.error) {
        console.error('[Supabase] Country save failed:', result.error);
        setError(
          /failed to fetch|networkerror|load failed/i.test(result.error.message)
            ? 'Could not reach the database to save this country. Check your connection and try Update Country again.'
            : result.error.message
        );
        setSaving(false);
        return;
      }

      await notifyAdminItemSaved({
        module: 'Destination',
        action: isEdit ? 'updated' : 'created',
        item: { ...payload, ...(result.data?.[0] || {}), id: isEdit ? countryId : result.data?.[0]?.id },
      });

      router.push(listHref);
    } catch (error) {
      console.error('[Supabase] Country save threw:', error);
      setError(
        error instanceof Error && /failed to fetch/i.test(error.message)
          ? 'Could not reach the database to save this country. Check your connection and try Update Country again.'
          : error instanceof Error
            ? error.message
            : 'Could not save this country.'
      );
      setSaving(false);
    }
  }

  return (
    <form id="country-form" onSubmit={handleSubmit} className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href={listHref}
        className="mb-6 inline-block text-sm font-medium text-[#6b7280] hover:text-[#374151]"
      >
        &lt; Back to Destinations
      </Link>

      <div className="admin-form-card rounded-3xl border border-[#e5e7eb] bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#161b22]">
        <h1 className="text-center font-serif text-3xl font-bold text-[#111827] dark:text-white">
          {isEdit ? 'Edit Destination' : 'Add New Destination'}
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <FieldLabel>Country Name</FieldLabel>
            <input
              value={name}
              onChange={(event) => {
                const value = event.target.value;
                setName(value);
                setSeo((current) => ({
                  ...current,
                  seo_title: current.seo_title || value,
                  slug: current.slug || slugify(value),
                }));
              }}
              required
              className="w-full rounded-full border-0 bg-[#f3f4f6] px-5 py-3 text-sm text-[#111827] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#66bb9a]/20"
            />
          </div>

          <div>
            <FieldLabel>Country Headline</FieldLabel>
            <input
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              className="w-full rounded-full border-0 bg-[#f3f4f6] px-5 py-3 text-sm text-[#111827] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#66bb9a]/20"
            />
          </div>
        </div>

        <div className="mt-8">
          <FieldLabel>Best Time to Visit</FieldLabel>
          <input
            value={bestTimeToVisit}
            onChange={(event) => setBestTimeToVisit(event.target.value)}
            placeholder="June–September and December–February"
            className="w-full rounded-full border-0 bg-[#f3f4f6] px-5 py-3 text-sm text-[#111827] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#66bb9a]/20"
          />
        </div>

        <div className="mt-8">
          <FieldLabel>Country Description</FieldLabel>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Type country description here..."
            minHeight={260}
            showFooter
            faqs={faqs}
            onFaqsChange={setFaqs}
            faqTitle="Country FAQ"
            faqDescription="These are the same country FAQs shown on the public destination page. Edit them here — they stay on the website."
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FieldLabel>Country Summary</FieldLabel>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={8}
              className="w-full resize-y rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm leading-relaxed text-[#111827] outline-none transition focus:border-[#66bb9a] focus:ring-2 focus:ring-[#66bb9a]/20"
            />
          </div>

          <CoverImageField
            label="Featured Image"
            folder="countries"
            value={featuredImage}
            onChange={(url) => {
              setFeaturedImage(url);
              setSeo((current) => ({ ...current, social_image_url: url }));
            }}
          />
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        <div className="mt-10 flex justify-center">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#66bb9a] px-10 py-3 text-sm font-semibold text-white transition hover:bg-[#5ba896] disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Country' : 'Create Country'}
          </button>
        </div>
      </div>

      <SeoPanel
        className="mt-6"
        values={seo}
        onChange={setSeo}
        pageTitle={name}
        coverImageUrl={featuredImage.startsWith('blob:') ? '' : featuredImage}
        contentForReadability={`${description}\n${summary}`}
        onSave={() => setSeoSaved(true)}
        saving={saving}
        contentType="country"
        indexRecord={{ name, title: name, image_url: featuredImage.startsWith('blob:') ? '' : featuredImage }}
      />
    </form>
  );
}
