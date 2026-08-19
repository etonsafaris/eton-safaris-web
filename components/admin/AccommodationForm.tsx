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
  return <label className="mb-2 block text-sm font-medium text-[#64748b]">{children}</label>;
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
      className="w-full rounded-lg border-0 bg-[#f9fafb] px-4 py-3 text-sm text-[#111827] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#8aa081]/25"
    />
  );
}

function SageSelect({
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

async function uploadAccommodationImage(file: File): Promise<string> {
  return uploadOptimizedImage(file, 'accommodations');
}

export default function AccommodationForm({ accommodationId }: AccommodationFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(accommodationId);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [descriptionTitle, setDescriptionTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accommodationType, setAccommodationType] = useState('');
  const [country, setCountry] = useState('');
  const [nationalPark, setNationalPark] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [blocks, setBlocks] = useState<AccommodationBlock[]>([]);
  const [draftBlock, setDraftBlock] = useState<AccommodationBlock>({ title: '', description: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [countries, setCountries] = useState<RecordRow[]>([]);
  const [parks, setParks] = useState<RecordRow[]>([]);
  const [seo, setSeo] = useState<SeoValues>(defaultSeoValues('stay'));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');
  const [publishedAt, setPublishedAt] = useState('');

  useEffect(() => {
    Promise.all([
      fetchCollectionRecords('countries'),
      fetchCollectionRecords('national_park', ['national_parks', 'parks']),
    ]).then(([countryRows, parkRows]) => {
      setCountries(countryRows);
      setParks(parkRows);
    });
  }, []);

  useEffect(() => {
    fetchCollectionRecords('accommodations').then((rows) => {
      if (!accommodationId) return;
      const accommodation = rows.find((row) => String(row.id) === accommodationId);
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
      setPublishedAt(pickDateValue(accommodation, ['published_at', 'created_at']) || '');
      setBlocks(parseBlocksFromRecord(accommodation));
    });
  }, [accommodationId]);

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
      parks
        .filter((row) => {
          if (!country) return true;
          const parkCountry = String(row.country || '').toLowerCase();
          return !parkCountry || parkCountry === country.toLowerCase();
        })
        .map((row) => ({
          value: getRecordTitle(row),
          label: getRecordTitle(row),
        })),
    [parks, country]
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

    const stamp = publishedAt || new Date().toISOString();
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
            published_at: stamp,
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

    router.push('/admin/accommodations');
    router.refresh();
  }

  return (
    <form id="accommodation-form" onSubmit={handleSubmit} className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/admin/accommodations"
        className="mb-6 inline-block text-sm font-medium text-[#64748b] hover:text-[#475569]"
      >
        &lt; Back to Accommodations
      </Link>

      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
        <h1 className="text-center font-serif text-3xl font-bold text-[#1e293b]">
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
              placeholder={country ? 'Select park' : 'Select country first'}
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
      />
    </form>
  );
}
