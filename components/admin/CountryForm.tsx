'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CoverImageField from '@/components/admin/CoverImageField';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SeoPanel from '@/components/admin/SeoPanel';
import { parseCmsPageExtras, serializeFaqs, faqRowsForStorage, type PageFaq } from '@/lib/cms-page-model';
import { faqsForEditor } from '@/lib/default-faqs';
import { fetchCollectionRecords, pickRecordId, slugify } from '@/lib/data';
import { embedContent, stripEmbeddedContent } from '@/lib/embedded-content';
import { isLocalOnlyImage } from '@/lib/public-image';
import {
  defaultSeoValues,
  seoValuesFromRecord,
  type SeoValues,
} from '@/lib/seo';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';

type CountryFormProps = {
  countryId?: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-medium text-[#374151]">{children}</label>;
}

export default function CountryForm({ countryId }: CountryFormProps) {
  const router = useRouter();
  const isEdit = Boolean(countryId);

  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bestTimeToVisit, setBestTimeToVisit] = useState('');
  const [description, setDescription] = useState('');
  const [summary, setSummary] = useState('');
  const [faqs, setFaqs] = useState<PageFaq[]>([]);
  const [featuredImage, setFeaturedImage] = useState('');
  const [seo, setSeo] = useState<SeoValues>(defaultSeoValues('country'));
  const [saving, setSaving] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCollectionRecords('countries').then((rows) => {
      if (!countryId) return;
      const country = rows.find(
        (row) => String(pickRecordId(row) ?? '') === String(countryId) || String(row.id) === String(countryId)
      );
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
    const payload = buildSavePayload(
      'countries',
      {
        name,
        tagline: headline,
        best_time_to_visit: bestTimeToVisit.trim(),
        description: embedContent(description, {
          fields: { faqs: packedFaqs, best_time_to_visit: bestTimeToVisit.trim() },
        }),
        summary,
        faqs: packedFaqs,
        post_blocks: packedFaqs,
        image_url: imageUrl,
        slug: seo.slug || slugify(name),
        status: 'Published',
        published_at: new Date().toISOString(),
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

      router.push('/admin/countries');
      router.refresh();
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
        href="/admin/countries"
        className="mb-6 inline-block text-sm font-medium text-[#6b7280] hover:text-[#374151]"
      >
        &lt; Back to Destinations
      </Link>

      <div className="rounded-3xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
        <h1 className="text-center font-serif text-3xl font-bold text-[#111827]">
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
      />
    </form>
  );
}
