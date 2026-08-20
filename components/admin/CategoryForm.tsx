'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import CoverImageField from '@/components/admin/CoverImageField';
import FaqEditor from '@/components/admin/FaqEditor';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SearchableSelect from '@/components/admin/SearchableSelect';
import SeoPanel from '@/components/admin/SeoPanel';
import { parseCmsPageExtras, serializeFaqs, type PageFaq } from '@/lib/cms-page-model';
import { fetchCollectionRecords, getRecordTitle, pickRecordId, slugify } from '@/lib/data';
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

type CategoryFormProps = {
  categoryId?: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold text-[#475569]">{children}</label>;
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

async function uploadCategoryImage(file: File): Promise<string> {
  return uploadOptimizedImage(file, 'categories');
}

export default function CategoryForm({ categoryId }: CategoryFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(categoryId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [faqs, setFaqs] = useState<PageFaq[]>([]);
  const [country, setCountry] = useState('');
  const [categoryImage, setCategoryImage] = useState('');
  const [countries, setCountries] = useState<RecordRow[]>([]);
  const [seo, setSeo] = useState<SeoValues>(defaultSeoValues('category'));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCollectionRecords('countries').then(setCountries);
  }, []);

  useEffect(() => {
    fetchCollectionRecords('categories').then((rows) => {
      if (!categoryId) return;
      const category = rows.find(
        (row) => String(pickRecordId(row) ?? '') === String(categoryId) || String(row.id) === String(categoryId)
      );
      if (!category) return;

      setTitle(String(category.name || category.title || ''));
      setDescription(stripEmbeddedContent(String(category.description || '')));
      setFaqs(parseCmsPageExtras(category, String(category.slug || '')).faqs);
      setCountry(String(category.country || ''));
      setCategoryImage(String(category.image_url || ''));
      setSeo(seoValuesFromRecord(category as Record<string, unknown>));
    });
  }, [categoryId]);

  const countryOptions = useMemo(
    () =>
      countries.map((row) => ({
        value: getRecordTitle(row),
        label: getRecordTitle(row),
      })),
    [countries]
  );

  async function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const publicUrl = await uploadCategoryImage(file);
      setCategoryImage(publicUrl);
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

    const packedFaqs = serializeFaqs(faqs);
    const payload = buildSavePayload(
      'categories',
      {
        name: title,
        description: embedContent(description, { fields: { faqs: packedFaqs } }),
        faqs: packedFaqs,
        country,
        image_url: categoryImage.startsWith('blob:') ? '' : categoryImage,
        slug: seo.slug || slugify(title),
      },
      { seo }
    );

    const result = await saveWithColumnFallback('categories', payload, isEdit ? categoryId : undefined);

    if (result.error) {
      console.error('[Supabase] Category save failed:', result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }

    await notifyAdminItemSaved({
      module: 'Category',
      action: isEdit ? 'updated' : 'created',
      item: { ...payload, ...(result.data?.[0] || {}), id: isEdit ? categoryId : result.data?.[0]?.id },
    });

    router.push('/admin/categories');
    router.refresh();
  }

  return (
    <form id="category-form" onSubmit={handleSubmit} className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/admin/categories"
        className="mb-6 inline-block text-sm font-medium text-[#64748b] hover:text-[#475569]"
      >
        &lt; Back to Categories
      </Link>

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-8 shadow-sm">
        <h1 className="text-center font-serif text-3xl font-bold text-[#1e293b]">
          {isEdit ? 'Edit Category' : 'Add New Category'}
        </h1>
        <p className="mt-2 text-center text-sm font-medium text-[#00A651]">
          The green FAQ module is directly under Category Title — it is not inside SEO.
        </p>

        <div className="mt-8">
          <FieldLabel>Category Title</FieldLabel>
          <input
            value={title}
            onChange={(event) => {
              const value = event.target.value;
              setTitle(value);
              setSeo((current) => ({
                ...current,
                seo_title: current.seo_title || value,
                slug: current.slug || slugify(value),
              }));
            }}
            required
            className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#76c7a9] focus:ring-2 focus:ring-[#76c7a9]/20"
          />
        </div>

        <FaqEditor
          faqs={faqs}
          onChange={setFaqs}
          title="Frequently asked questions"
          description="These appear on this category’s public page, directly under the category description."
        />

        <div className="mt-8">
          <FieldLabel>Category Description</FieldLabel>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Type category description here..."
            minHeight={260}
            showFooter
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <FieldLabel>Country</FieldLabel>
            <CountrySelect
              value={country}
              onChange={setCountry}
              options={countryOptions}
              placeholder="Select Country"
            />
          </div>

          <CoverImageField
            label="Category Image"
            folder="categories"
            value={categoryImage}
            onChange={(url) => {
              setCategoryImage(url);
              setSeo((current) => ({ ...current, social_image_url: url }));
            }}
          />
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        <div className="mt-10 flex justify-center">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-lg bg-[#76c7a9] px-10 py-3 text-sm font-semibold text-white transition hover:bg-[#66bb9a] disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      </div>

      <SeoPanel
        className="mt-6"
        values={seo}
        onChange={setSeo}
        pageTitle={title}
        coverImageUrl={categoryImage.startsWith('blob:') ? '' : categoryImage}
        contentForReadability={description}
        onSave={() => setSeoSaved(true)}
        saving={saving}
        contentType="category"
      />
    </form>
  );
}
