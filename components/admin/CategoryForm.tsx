'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminCollectionListHref } from '@/lib/use-admin-list-href';
import CoverImageField from '@/components/admin/CoverImageField';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SearchableSelect from '@/components/admin/SearchableSelect';
import SeoPanel from '@/components/admin/SeoPanel';
import { parseCmsPageExtras, serializeFaqs, faqRowsForStorage, type PageFaq } from '@/lib/cms-page-model';
import { faqsForEditor } from '@/lib/default-faqs';
import {
  fetchCollectionRecordById,
  fetchCollectionRecords,
  getRecordTitle,
  pickRecordId,
  publishStampForSave,
  recordPublishedAt,
  slugify,
} from '@/lib/data';
import { embedContent, stripEmbeddedContent } from '@/lib/embedded-content';
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
import type { RecordRow } from '@/lib/types';

type CategoryFormProps = {
  categoryId?: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-[#475569] dark:text-gray-200">{children}</label>
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

async function uploadCategoryImage(file: File): Promise<string> {
  return uploadOptimizedImage(file, 'categories');
}

export default function CategoryForm(props: CategoryFormProps) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading form…</p>}>
      <CategoryFormInner {...props} />
    </Suspense>
  );
}

function CategoryFormInner({ categoryId }: CategoryFormProps) {
  const listHref = useAdminCollectionListHref('categories');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(categoryId);

  const prefillRow = categoryId ? readAdminEditPrefill('categories', categoryId) : null;
  const [title, setTitle] = useState(() => String(prefillRow?.name || prefillRow?.title || ''));
  const [description, setDescription] = useState(() =>
    prefillRow ? stripEmbeddedContent(String(prefillRow.description || '')) : ''
  );
  const [faqs, setFaqs] = useState<PageFaq[]>(() => (prefillRow ? faqsForEditor(prefillRow, 'categories') : []));
  const [country, setCountry] = useState(() => String(prefillRow?.country || ''));
  const [categoryImage, setCategoryImage] = useState(() => String(prefillRow?.image_url || ''));
  const [publishedAt, setPublishedAt] = useState(() => (prefillRow ? recordPublishedAt(prefillRow) : ''));
  const [countries, setCountries] = useState<RecordRow[]>([]);
  const [seo, setSeo] = useState<SeoValues>(() =>
    prefillRow ? seoValuesFromRecord(prefillRow as Record<string, unknown>) : defaultSeoValues('category')
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCollectionRecords('countries').then(setCountries);
  }, []);

  useEffect(() => {
    if (!categoryId) return;
    fetchCollectionRecordById('categories', categoryId).then((category) => {
      if (!category) return;

      setTitle(String(category.name || category.title || ''));
      setDescription(stripEmbeddedContent(String(category.description || '')));
      setFaqs(faqsForEditor(category, 'categories'));
      setCountry(String(category.country || ''));
      setCategoryImage(String(category.image_url || ''));
      setPublishedAt(recordPublishedAt(category));
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
    if (!country.trim()) {
      setError('Select the country this category belongs to.');
      return;
    }

    setSaving(true);
    setError('');

    const packedFaqs = serializeFaqs(faqs);
    const currentSlug = slugify(title);
    const stamp = publishStampForSave(publishedAt, isEdit);
    const seoForSave: SeoValues = {
      ...seo,
      slug: currentSlug,
      seo_title: seo.seo_title || title,
    };
    const payload = buildSavePayload(
      'categories',
      {
        name: title,
        description: embedContent(description, {
          fields: { faqs: packedFaqs, published_at: stamp },
        }),
        faqs: packedFaqs,
        post_blocks: faqRowsForStorage(faqs),
        country,
        image_url: categoryImage.startsWith('blob:') ? '' : categoryImage,
        // Public links always use the current category title, not a previous rename.
        slug: currentSlug,
        // Keep the original publish date when present; stamp legacy rows that never had one.
        published_at: stamp,
      },
      { seo: seoForSave }
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

    router.push(listHref);
  }

  return (
    <form id="category-form" onSubmit={handleSubmit} className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href={listHref}
        className="mb-6 inline-block text-sm font-medium text-[#64748b] hover:text-[#475569]"
      >
        &lt; Back to Categories
      </Link>

      <div className="admin-form-card rounded-xl border border-[#e2e8f0] bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#161b22]">
        <h1 className="text-center font-serif text-3xl font-bold text-[#1e293b] dark:text-white">
          {isEdit ? 'Edit Category' : 'Add New Category'}
        </h1>

        <div className="mt-8">
          <FieldLabel>Category Title</FieldLabel>
          <input
            value={title}
            onChange={(event) => {
              const value = event.target.value;
              const nextSlug = slugify(value);
              setTitle(value);
              // Keep the public slug locked to the current category title (not an old rename).
              setSeo((current) => ({
                ...current,
                seo_title: current.seo_title || value,
                slug: nextSlug,
              }));
            }}
            required
            className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#76c7a9] focus:ring-2 focus:ring-[#76c7a9]/20"
          />
        </div>

        <div className="mt-8">
          <FieldLabel>Category Description</FieldLabel>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Type category description here..."
            minHeight={260}
            showFooter
            faqs={faqs}
            onFaqsChange={setFaqs}
            faqTitle="Category FAQ"
            faqDescription="These are the FAQs shown on the public category page. Edit them here — they stay on the website."
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <FieldLabel>Country *</FieldLabel>
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
        indexRecord={{
          country,
          title,
          name: title,
          image_url: categoryImage.startsWith('blob:') ? '' : categoryImage,
        }}
      />
    </form>
  );
}
