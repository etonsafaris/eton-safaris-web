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
import { fetchCollectionRecordById, fetchCollectionRecords, getRecordTitle, parseBlocksFromRecord, publishStampForSave, recordPublishedAt, slugify } from '@/lib/data';
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
import { readAdminEditPrefill } from '@/lib/admin-edit-prefill';
import { saveWithColumnFallback } from '@/lib/admin-records-client';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';
import { uploadOptimizedImage } from '@/lib/upload-media';
import { formatUploadErrorMessage } from '@/lib/upload-error-message';
import type { RecordRow } from '@/lib/types';

type ParkBlock = {
  title: string;
  description: string;
};

type NationalParkFormProps = {
  parkId?: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-medium text-[#4b5563] dark:text-gray-200">{children}</label>
  );
}

function PillInput({
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
      className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#66bba4] focus:bg-white focus:ring-2 focus:ring-[#66bba4]/20 dark:border-white/10 dark:bg-[#161b22] dark:text-white dark:focus:bg-[#1e293b]"
    />
  );
}

function CountrySelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return <SearchableSelect value={value} onChange={onChange} options={options} placeholder={placeholder} />;
}

async function uploadParkImage(file: File): Promise<string> {
  return uploadOptimizedImage(file, 'national-parks');
}

export default function NationalParkForm(props: NationalParkFormProps) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading form…</p>}>
      <NationalParkFormInner {...props} />
    </Suspense>
  );
}

function NationalParkFormInner({ parkId }: NationalParkFormProps) {
  const listHref = useAdminCollectionListHref('national_park');
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(parkId);

  const [name, setName] = useState(() => {
    if (!parkId) return '';
    const row = readAdminEditPrefill('national_park', parkId);
    return row ? String(row.name || '') : '';
  });
  const [location, setLocation] = useState(() => {
    if (!parkId) return '';
    const row = readAdminEditPrefill('national_park', parkId);
    return row ? String(row.location || '') : '';
  });
  const [descriptionTitle, setDescriptionTitle] = useState(() => {
    if (!parkId) return '';
    const row = readAdminEditPrefill('national_park', parkId);
    return row ? String(row.description_title || '') : '';
  });
  const [description, setDescription] = useState(() => {
    if (!parkId) return '';
    const row = readAdminEditPrefill('national_park', parkId);
    return row ? stripEmbeddedContent(String(row.description || '')) : '';
  });
  const [country, setCountry] = useState(() => {
    if (!parkId) return '';
    const row = readAdminEditPrefill('national_park', parkId);
    return row ? String(row.country || '') : '';
  });
  const [featuredImage, setFeaturedImage] = useState(() => {
    if (!parkId) return '';
    const row = readAdminEditPrefill('national_park', parkId);
    return row ? String(row.image_url || '') : '';
  });
  const [blocks, setBlocks] = useState<ParkBlock[]>([]);
  const [draftBlock, setDraftBlock] = useState<ParkBlock>({ title: '', description: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [countries, setCountries] = useState<RecordRow[]>([]);
  const [seo, setSeo] = useState<SeoValues>(() => {
    if (!parkId) return defaultSeoValues('park');
    const row = readAdminEditPrefill('national_park', parkId);
    return row ? seoValuesFromRecord(row as Record<string, unknown>) : defaultSeoValues('park');
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');
  const [publishedAt, setPublishedAt] = useState(() => {
    if (!parkId) return '';
    const row = readAdminEditPrefill('national_park', parkId);
    return row ? recordPublishedAt(row) : '';
  });
  const [faqs, setFaqs] = useState<PageFaq[]>(() => {
    if (!parkId) return [];
    const row = readAdminEditPrefill('national_park', parkId);
    return row ? faqsForEditor(row, 'national_park') : [];
  });

  useEffect(() => {
    fetchCollectionRecords('countries').then(setCountries);
  }, []);

  useEffect(() => {
    if (parkId) return;
    const presetCountry = searchParams?.get('country')?.trim();
    if (!presetCountry) return;
    setCountry((current) => current || presetCountry);
  }, [parkId, searchParams]);

  useEffect(() => {
    if (!parkId) return;
    fetchCollectionRecordById('national_park', parkId, ['national_parks', 'parks']).then((park) => {
      if (!park) return;

      setName(String(park.name || ''));
      setLocation(String(park.location || ''));
      setDescriptionTitle(String(park.description_title || ''));
      setDescription(stripEmbeddedContent(String(park.description || '')));
      setCountry(String(park.country || ''));
      setFeaturedImage(String(park.image_url || ''));
      setSeo(seoValuesFromRecord(park as Record<string, unknown>));
      setPublishedAt(recordPublishedAt(park));
      setBlocks(parseBlocksFromRecord(park));
      setFaqs(faqsForEditor(park, 'national_park'));
    });
  }, [parkId]);

  useEffect(() => {
    if (parkId) return;
    setFaqs(
      faqsForEditor(
        { name, title: name, country, slug: seo.slug } as RecordRow,
        'national_park'
      )
    );
  }, [parkId, country]);

  const countryOptions = useMemo(
    () =>
      countries.map((row) => ({
        value: getRecordTitle(row),
        label: getRecordTitle(row),
      })),
    [countries]
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
      const publicUrl = await uploadParkImage(file);
      setFeaturedImage(publicUrl);
    } catch (err) {
      setError(formatUploadErrorMessage(err));
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
      'national_park',
      {
        name,
        location,
        description_title: descriptionTitle,
        description: embedContent(description, {
          blocks,
          fields: {
            description_title: descriptionTitle,
            location,
            country,
            faqs: serializeFaqs(faqs),
            ...(stamp ? { published_at: stamp } : {}),
          },
        }),
        country,
        image_url: featuredImage.startsWith('blob:') ? '' : featuredImage,
        park_blocks: JSON.stringify(blocks),
        published_at: stamp,
        slug: seo.slug || slugify(name),
      },
      { seo }
    );

    const result = await saveWithColumnFallback('national_park', payload, isEdit ? parkId : undefined);

    if (result.error) {
      console.error('[Supabase] National park save failed:', result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }

    await notifyAdminItemSaved({
      module: 'National Park',
      action: isEdit ? 'updated' : 'created',
      item: { ...payload, ...(result.data?.[0] || {}), id: isEdit ? parkId : result.data?.[0]?.id },
    });

    router.push(listHref);
  }

  return (
    <form id="national-park-form" onSubmit={handleSubmit} className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href={listHref}
        className="mb-6 inline-block text-sm font-medium text-[#64748b] hover:text-[#475569]"
      >
        &lt; Back to National Parks
      </Link>

      <div className="admin-form-card rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#161b22]">
        <h1 className="text-center font-serif text-3xl font-bold text-[#1f2937] dark:text-white">
          {isEdit ? 'Edit National Park' : 'Add New National Park'}
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <FieldLabel>Park Name</FieldLabel>
            <PillInput
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
            <PillInput value={location} onChange={setLocation} />
          </div>
        </div>

        <div className="mt-6">
          <FieldLabel>Description Title</FieldLabel>
          <PillInput value={descriptionTitle} onChange={setDescriptionTitle} />
        </div>

        <div className="mt-6">
          <FieldLabel>Description</FieldLabel>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Type national park description here..."
            minHeight={260}
            showFooter
            faqs={faqs}
            onFaqsChange={setFaqs}
            faqTitle="Park FAQ"
            faqDescription="These are the same FAQs shown on the public park page. Edit them here — they stay on the website."
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FieldLabel>Country</FieldLabel>
            <CountrySelect
              value={country}
              onChange={setCountry}
              options={countryOptions}
              placeholder="Select Country"
            />
          </div>

          <CoverImageField
            label="Featured Image"
            folder="national-parks"
            value={featuredImage}
            onChange={(url) => {
              setFeaturedImage(url);
              setSeo((current) => ({ ...current, social_image_url: url }));
            }}
          />
        </div>

        <div className="mt-8 rounded-xl bg-[#f9fafb] p-6">
          <SavedBlocksGrid
            heading="Park Blocks"
            blocks={blocks}
            onEdit={editBlock}
            onDelete={deleteBlock}
            onMove={moveBlock}
          />

          <h2 className={`font-serif text-2xl font-bold italic text-[#374151] ${blocks.length > 0 ? 'mt-2' : ''}`}>
            {editingIndex !== null ? 'Edit Block' : 'New Block'}
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <FieldLabel>Block Title</FieldLabel>
              <input
                value={draftBlock.title}
                onChange={(event) => setDraftBlock({ ...draftBlock, title: event.target.value })}
                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#66bba4] focus:ring-2 focus:ring-[#66bba4]/20"
              />
            </div>

            <div>
              <FieldLabel>Block Description</FieldLabel>
              <RichTextEditor
                value={draftBlock.description}
                onChange={(value) => setDraftBlock({ ...draftBlock, description: value })}
                placeholder="Type block description here..."
                minHeight={200}
                showFooter
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end rounded-b-xl bg-[#eceff1] px-4 py-3">
            <button
              type="button"
              onClick={addBlock}
              className="rounded-full bg-[#00A651] px-5 py-1.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#00945a]"
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
            className="rounded-full bg-[#66bba4] px-10 py-3 text-sm font-semibold text-white transition hover:bg-[#5ba896] disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Update National Park' : 'Create National Park'}
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
        contentType="park"
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
