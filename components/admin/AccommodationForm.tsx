'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminCollectionListHref } from '@/lib/use-admin-list-href';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SavedBlocksGrid from '@/components/admin/SavedBlocksGrid';
import SearchableSelect from '@/components/admin/SearchableSelect';
import SeoPanel from '@/components/admin/SeoPanel';
import CoverImageField from '@/components/admin/CoverImageField';
import { adminListColumnsFor, fetchCollectionRecordById, fetchCollectionRecords, getRecordTitle, parseBlocksFromRecord, publishStampForSave, recordPublishedAt, slugify } from '@/lib/data';
import { readAdminEditPrefill } from '@/lib/admin-edit-prefill';
import { fetchAdminTablePage } from '@/lib/admin-records-client';
import { adjustEditingIndexAfterMove, moveArrayItem } from '@/lib/reorder';
import { embedContent, stripEmbeddedContent } from '@/lib/embedded-content';
import { faqsForEditor } from '@/lib/default-faqs';
import { serializeFaqs, type PageFaq } from '@/lib/cms-page-model';
import {
  defaultSeoValues,
  seoValuesFromRecord,
  type SeoValues,
} from '@/lib/seo';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/admin-records-client';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';
import { uploadOptimizedImage } from '@/lib/upload-media';
import type { RecordRow } from '@/lib/types';

type AccommodationBlock = {
  title: string;
  description: string;
};

type AccommodationFormProps = {
  accommodationId?: string;
};

const ACCOMMODATION_TYPES = [
  'Luxury Lodge',
  'Mid-range Lodge',
  'Luxury Tented Camp',
  'Mid-Range Tented Camp',
  'Luxury Hotel',
  'Mid-Range Hotel',
  'Luxury Banda',
  'Mid-Range Banda',
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-medium text-[#64748b] dark:text-gray-200">{children}</label>
  );
}

function SoftInput({
  value,
  onChange,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      className="w-full rounded-lg border-0 bg-[#f9fafb] px-4 py-3 text-sm text-[#111827] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#8aa081]/25 dark:bg-[#161b22] dark:text-white dark:focus:bg-[#1e293b]"
    />
  );
}

function SageSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

async function uploadAccommodationImage(file: File): Promise<string> {
  return uploadOptimizedImage(file, 'accommodations');
}

export default function AccommodationForm(props: AccommodationFormProps) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading form…</p>}>
      <AccommodationFormInner {...props} />
    </Suspense>
  );
}

function AccommodationFormInner({ accommodationId }: AccommodationFormProps) {
  const listHref = useAdminCollectionListHref('accommodations');
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(accommodationId);

  const prefillRow = accommodationId ? readAdminEditPrefill('accommodations', accommodationId) : null;
  const [name, setName] = useState(() => String(prefillRow?.name || ''));
  const [location, setLocation] = useState(() => String(prefillRow?.location || ''));
  const [descriptionTitle, setDescriptionTitle] = useState(() => String(prefillRow?.description_title || ''));
  const [description, setDescription] = useState(() =>
    prefillRow ? stripEmbeddedContent(String(prefillRow.description || '')) : ''
  );
  const [accommodationType, setAccommodationType] = useState(() => String(prefillRow?.type || ''));
  const [country, setCountry] = useState(() => String(prefillRow?.country || ''));
  const [nationalPark, setNationalPark] = useState(() =>
    String(prefillRow?.national_park || prefillRow?.national_park_name || prefillRow?.park || '')
  );
  const [featuredImage, setFeaturedImage] = useState(() => String(prefillRow?.image_url || ''));
  const [blocks, setBlocks] = useState<AccommodationBlock[]>([]);
  const [draftBlock, setDraftBlock] = useState<AccommodationBlock>({ title: '', description: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [countries, setCountries] = useState<RecordRow[]>([]);
  const [parks, setParks] = useState<RecordRow[]>([]);
  const [seo, setSeo] = useState<SeoValues>(() =>
    prefillRow ? seoValuesFromRecord(prefillRow as Record<string, unknown>) : defaultSeoValues('stay')
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');
  const [publishedAt, setPublishedAt] = useState(() => (prefillRow ? recordPublishedAt(prefillRow) : ''));
  const [faqs, setFaqs] = useState<PageFaq[]>(() =>
    prefillRow ? faqsForEditor(prefillRow, 'accommodations') : []
  );

  useEffect(() => {
    fetchCollectionRecords('countries', [], {
      columns: adminListColumnsFor('countries') || 'id,name,title,tagline,image_url,status',
    }).then(setCountries);
  }, []);

  useEffect(() => {
    if (!country) {
      setParks([]);
      return;
    }
    fetchAdminTablePage('national_park', { page: 1, limit: 50, country })
      .then((page) => setParks(page.rows))
      .catch(() => setParks([]));
  }, [country]);

  useEffect(() => {
    if (accommodationId) return;
    const presetCountry = searchParams?.get('country')?.trim();
    const presetPark = searchParams?.get('park')?.trim();
    if (presetCountry) setCountry((current) => current || presetCountry);
    if (presetPark) setNationalPark((current) => current || presetPark);
  }, [accommodationId, searchParams]);

  useEffect(() => {
    if (!accommodationId) return;
    fetchCollectionRecordById('accommodations', accommodationId).then((accommodation) => {
      if (!accommodation) return;

      setName(String(accommodation.name || ''));
      setLocation(String(accommodation.location || ''));
      setDescriptionTitle(String(accommodation.description_title || ''));
      setDescription(stripEmbeddedContent(String(accommodation.description || '')));
      setAccommodationType(String(accommodation.type || ''));
      setCountry(String(accommodation.country || ''));
      setNationalPark(String(accommodation.national_park || accommodation.park || accommodation.park_name || ''));
      setFeaturedImage(String(accommodation.image_url || ''));
      setSeo(seoValuesFromRecord(accommodation as Record<string, unknown>));
      setPublishedAt(recordPublishedAt(accommodation));
      setBlocks(parseBlocksFromRecord(accommodation));
      setFaqs(faqsForEditor(accommodation, 'accommodations'));
    });
  }, [accommodationId]);

  useEffect(() => {
    if (accommodationId) return;
    setFaqs(
      faqsForEditor(
        { name, title: name, country, slug: seo.slug } as RecordRow,
        'accommodations'
      )
    );
  }, [accommodationId, country]);

  const countryOptions = useMemo(
    () =>
      countries.map((row) => ({
        value: getRecordTitle(row),
        label: getRecordTitle(row),
      })),
    [countries]
  );

  const typeOptions = useMemo(
    () => ACCOMMODATION_TYPES.map((type) => ({ value: type, label: type })),
    []
  );

  const parkOptions = useMemo(
    () =>
      parks.map((row) => ({
        value: getRecordTitle(row),
        label: getRecordTitle(row),
      })),
    [parks]
  );

  function addBlock() {
    if (!draftBlock.title.trim() && !draftBlock.description.trim()) return;
    setBlocks((current) => {
      if (editingIndex !== null) {
        return current.map((block, index) => (index === editingIndex ? draftBlock : block));
      }
      return [...current, draftBlock];
    });
    setDraftBlock({ title: '', description: '' });
    setEditingIndex(null);
  }

  function editBlock(index: number) {
    const block = blocks[index];
    if (!block) return;
    setDraftBlock(block);
    setEditingIndex(index);
  }

  function deleteBlock(index: number) {
    setBlocks((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (editingIndex === index) {
      setDraftBlock({ title: '', description: '' });
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((current) => moveArrayItem(current, index, direction));
    setEditingIndex((current) => adjustEditingIndexAfterMove(current, index, direction));
  }

  async function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const publicUrl = await uploadAccommodationImage(file);
      setFeaturedImage(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed. Check storage permissions.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const stamp = publishStampForSave(publishedAt, isEdit);
    const payload = buildSavePayload(
      'accommodations',
      {
        name,
        location,
        description_title: descriptionTitle,
        description: embedContent(description, {
          blocks,
          fields: {
            description_title: descriptionTitle,
            type: accommodationType,
            national_park: nationalPark,
            location,
            country,
            faqs: serializeFaqs(faqs),
            ...(stamp ? { published_at: stamp } : {}),
          },
        }),
        type: accommodationType,
        country,
        national_park: nationalPark,
        park: nationalPark,
        image_url: featuredImage.startsWith('blob:') ? '' : featuredImage,
        accommodation_blocks: JSON.stringify(blocks),
        published_at: stamp,
        slug: seo.slug || slugify(name),
      },
      { seo }
    );

    const result = await saveWithColumnFallback('accommodations', payload, isEdit ? accommodationId : undefined);

    if (result.error) {
      console.error('[Supabase] Accommodation save failed:', result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }

    await notifyAdminItemSaved({
      module: 'Accommodation',
      action: isEdit ? 'updated' : 'created',
      item: { ...payload, ...(result.data?.[0] || {}), id: isEdit ? accommodationId : result.data?.[0]?.id },
    });

    router.push(listHref);
  }

  return (
    <form id="accommodation-form" onSubmit={handleSubmit} className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href={listHref}
        className="mb-6 inline-block text-sm font-medium text-[#64748b] hover:text-[#475569]"
      >
        &lt; Back to Accommodations
      </Link>

      <div className="admin-form-card rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#161b22]">
        <h1 className="text-center font-serif text-3xl font-bold text-[#1e293b] dark:text-white">
          {isEdit ? 'Edit Accommodation' : 'Add New Accommodation'}
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <FieldLabel>Accommodation Name</FieldLabel>
            <SoftInput
              value={name}
              onChange={(value) => {
                setName(value);
                setSeo((current) => ({
                  ...current,
                  seo_title: current.seo_title || value,
                  slug: current.slug || slugify(value),
                }));
              }}
              required
            />
          </div>

          <div>
            <FieldLabel>Location</FieldLabel>
            <SoftInput value={location} onChange={setLocation} />
          </div>
        </div>

        <div className="mt-6">
          <FieldLabel>Description Title</FieldLabel>
          <SoftInput value={descriptionTitle} onChange={setDescriptionTitle} />
        </div>

        <div className="mt-6">
          <FieldLabel>Description</FieldLabel>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Type accommodation description here..."
            minHeight={260}
            showFooter
            faqs={faqs}
            onFaqsChange={setFaqs}
            faqTitle="Stay FAQ"
            faqDescription="These FAQs can be shown with this stay. Edit them here — they save with the accommodation."
          />
        </div>

        <div className="mt-6">
          <FieldLabel>Accommodation Type</FieldLabel>
          <SageSelect
            value={accommodationType}
            onChange={setAccommodationType}
            options={typeOptions}
            placeholder="Select Type"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <FieldLabel>Country</FieldLabel>
            <SageSelect
              value={country}
              onChange={(value) => {
                setCountry(value);
                setNationalPark('');
              }}
              options={countryOptions}
              placeholder="Select Country"
            />
          </div>
          <div>
            <FieldLabel>National Park</FieldLabel>
            <SageSelect
              value={nationalPark}
              onChange={setNationalPark}
              options={parkOptions}
              placeholder={country ? 'Select park' : 'Type a country first'}
              disabled={!country}
            />
          </div>
        </div>

        <CoverImageField
          label="Featured Image"
          folder="accommodations"
          value={featuredImage}
          onChange={(url) => {
            setFeaturedImage(url);
            setSeo((current) => ({ ...current, social_image_url: url }));
          }}
        />

        <div className="mt-8 rounded-xl bg-[#f3f4f6] p-6">
          <SavedBlocksGrid
            heading="Accommodation Blocks"
            blocks={blocks}
            onEdit={editBlock}
            onDelete={deleteBlock}
            onMove={moveBlock}
          />

          <h2 className={`font-serif text-2xl font-bold text-[#111827] ${blocks.length > 0 ? 'mt-2' : ''}`}>
            {editingIndex !== null ? 'Edit Block' : 'New Block'}
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <FieldLabel>Block Title</FieldLabel>
              <input
                value={draftBlock.title}
                onChange={(event) => setDraftBlock({ ...draftBlock, title: event.target.value })}
                className="w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#8aa081] focus:ring-2 focus:ring-[#8aa081]/20"
              />
            </div>

            <div>
              <FieldLabel>Block Description</FieldLabel>
              <RichTextEditor
                value={draftBlock.description}
                onChange={(value) => setDraftBlock({ ...draftBlock, description: value })}
                placeholder="Type block description here..."
                minHeight={220}
                showFooter
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end rounded-b-xl bg-[#eceff1] px-4 py-3">
            <button
              type="button"
              onClick={addBlock}
              className="rounded-full bg-[#10b981] px-5 py-1.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#059669]"
            >
              {editingIndex !== null ? 'Update' : 'ADD'}
            </button>
          </div>
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        <div className="mt-10 flex justify-center border-t border-[#e5e7eb] pt-10">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-md bg-[#66bb6a] px-10 py-3 text-sm font-semibold text-white transition hover:bg-[#57a85b] disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Accommodation' : 'Create Accommodation'}
          </button>
        </div>
      </div>

      <SeoPanel
        className="mt-6"
        values={seo}
        onChange={setSeo}
        pageTitle={name}
        coverImageUrl={featuredImage.startsWith('blob:') ? '' : featuredImage}
        contentForReadability={`${description}\n${blocks.map((block) => block.description).join('\n')}`}
        onSave={() => setSeoSaved(true)}
        saving={saving}
        contentType="stay"
        indexRecord={{
          country,
          name,
          title: name,
          image_url: featuredImage.startsWith('blob:') ? '' : featuredImage,
        }}
      />
    </form>
  );
}
