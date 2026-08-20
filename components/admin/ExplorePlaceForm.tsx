'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SavedBlocksGrid from '@/components/admin/SavedBlocksGrid';
import SearchableSelect from '@/components/admin/SearchableSelect';
import SeoPanel from '@/components/admin/SeoPanel';
import CoverImageField from '@/components/admin/CoverImageField';
import { fetchCollectionRecords, getRecordTitle, parseBlocksFromRecord, pickDateValue, slugify } from '@/lib/data';
import { embedContent, stripEmbeddedContent } from '@/lib/embedded-content';
import {
  defaultSeoValues,
  seoValuesFromRecord,
  type SeoValues,
} from '@/lib/seo';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';
import { uploadOptimizedImage } from '@/lib/upload-media';
import type { RecordRow } from '@/lib/types';

type PlaceBlock = {
  title: string;
  description: string;
};

type ExplorePlaceFormProps = {
  placeId?: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold text-[#374151]">{children}</label>;
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
      className="w-full rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm text-[#111827] outline-none transition focus:border-[#66bb9a] focus:ring-2 focus:ring-[#66bb9a]/20"
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

async function uploadPlaceImage(file: File): Promise<string> {
  return uploadOptimizedImage(file, 'explore');
}

export default function ExplorePlaceForm({ placeId }: ExplorePlaceFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(placeId);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [descriptionTitle, setDescriptionTitle] = useState('');
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [blocks, setBlocks] = useState<PlaceBlock[]>([]);
  const [draftBlock, setDraftBlock] = useState<PlaceBlock>({ title: '', description: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [countries, setCountries] = useState<RecordRow[]>([]);
  const [seo, setSeo] = useState<SeoValues>(defaultSeoValues('place'));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');
  const [publishedAt, setPublishedAt] = useState('');

  useEffect(() => {
    fetchCollectionRecords('countries').then(setCountries);
  }, []);

  useEffect(() => {
    fetchCollectionRecords('explore').then((rows) => {
      if (!placeId) return;
      const place = rows.find((row) => String(row.id) === placeId);
      if (!place) return;

      setTitle(String(place.title || place.name || ''));
      setLocation(String(place.location || ''));
      setDescriptionTitle(String(place.description_title || ''));
      setDescription(stripEmbeddedContent(String(place.description || '')));
      setCountry(String(place.country || ''));
      setFeaturedImage(String(place.image_url || ''));
      setSeo(seoValuesFromRecord(place as Record<string, unknown>));
      setPublishedAt(pickDateValue(place, ['published_at', 'created_at']) || '');
      setBlocks(parseBlocksFromRecord(place));
    });
  }, [placeId]);

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
      return [draftBlock, ...current];
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

  async function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const publicUrl = await uploadPlaceImage(file);
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

    const stamp = publishedAt || new Date().toISOString();
    const payload = buildSavePayload(
      'explore',
      {
        title,
        location,
        description_title: descriptionTitle,
        description: embedContent(description, {
          blocks,
          fields: {
            description_title: descriptionTitle,
            location,
            country,
            published_at: stamp,
          },
        }),
        country,
        image_url: featuredImage.startsWith('blob:') ? '' : featuredImage,
        place_blocks: JSON.stringify(blocks),
        published_at: stamp,
        slug: seo.slug || slugify(title),
      },
      { seo }
    );

    const result = await saveWithColumnFallback('explore', payload, isEdit ? placeId : undefined);

    if (result.error) {
      console.error('[Supabase] Explore place save failed:', result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }

    await notifyAdminItemSaved({
      module: 'Place',
      action: isEdit ? 'updated' : 'created',
      item: { ...payload, ...(result.data?.[0] || {}), id: isEdit ? placeId : result.data?.[0]?.id },
    });

    router.push('/admin/explore');
    router.refresh();
  }

  return (
    <form id="explore-place-form" onSubmit={handleSubmit} className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/admin/explore"
        className="mb-6 inline-block text-sm font-medium text-[#6b7280] hover:text-[#374151]"
      >
        &lt; Back to Places
      </Link>

      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
        <h1 className="text-center font-serif text-3xl font-bold text-[#111827]">
          {isEdit ? 'Edit Place' : 'Add New Place'}
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <FieldLabel>Place Name</FieldLabel>
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
            placeholder="Type place description here..."
            minHeight={260}
            showFooter
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <FieldLabel>Country</FieldLabel>
            <CountrySelect
              value={country}
              onChange={setCountry}
              options={countryOptions}
              placeholder="Select Country"
            />
          </div>

          <CoverImageField
            className="lg:col-span-2"
            label="Featured Image"
            folder="explore"
            value={featuredImage}
            onChange={(url) => {
              setFeaturedImage(url);
              setSeo((current) => ({ ...current, social_image_url: url }));
            }}
          />
        </div>

        <div className="mt-8 rounded-xl bg-[#f3f4f6] p-6">
          <SavedBlocksGrid
            heading="Place Blocks"
            blocks={blocks}
            onEdit={editBlock}
            onDelete={deleteBlock}
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
                className="w-full rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm outline-none transition focus:border-[#66bb9a] focus:ring-2 focus:ring-[#66bb9a]/20"
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
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10b981] text-xs font-bold text-white hover:bg-[#059669]"
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
            className="rounded-full bg-[#66bb9a] px-10 py-3 text-sm font-semibold text-white transition hover:bg-[#57a85b] disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Place' : 'Create Place'}
          </button>
        </div>
      </div>

      <SeoPanel
        className="mt-6"
        values={seo}
        onChange={setSeo}
        pageTitle={title}
        coverImageUrl={featuredImage.startsWith('blob:') ? '' : featuredImage}
        contentForReadability={`${description}\n${blocks.map((block) => block.description).join('\n')}`}
        onSave={() => setSeoSaved(true)}
        saving={saving}
        contentType="place"
      />
    </form>
  );
}
