'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CoverImageField from '@/components/admin/CoverImageField';
import FaqEditor from '@/components/admin/FaqEditor';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SavedBlocksGrid from '@/components/admin/SavedBlocksGrid';
import SearchableSelect from '@/components/admin/SearchableSelect';
import SeoPanel from '@/components/admin/SeoPanel';
import {
  cmsPageFieldPack,
  inferPageLayout,
  PAGE_LAYOUTS,
  parseCmsBlocks,
  parseCmsPageExtras,
  type CmsContentBlock,
  type CmsPageLayout,
  type PageFaq,
} from '@/lib/cms-page-model';
import { faqsForEditor } from '@/lib/default-faqs';
import { ABOUT_DESTINATION_CHIPS } from '@/lib/destination-chips';
import { fetchCollectionRecords, pickDateValue, pickRecordId, slugify } from '@/lib/data';
import { embedContent, stripEmbeddedContent } from '@/lib/embedded-content';
import { defaultSeoValues, seoValuesFromRecord, type SeoValues } from '@/lib/seo';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';
import { uploadOptimizedImage } from '@/lib/upload-media';

type PageFormProps = {
  pageId?: string;
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

export default function PageForm({ pageId }: PageFormProps) {
  const router = useRouter();
  const isEdit = Boolean(pageId);

  const [title, setTitle] = useState('');
  const [layout, setLayout] = useState<CmsPageLayout>('standard');
  const [heroTitle, setHeroTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [destinations, setDestinations] = useState(ABOUT_DESTINATION_CHIPS.join(', '));
  const [featuredImage, setFeaturedImage] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [ctaLabel, setCtaLabel] = useState('Talk to Us');
  const [ctaHref, setCtaHref] = useState('/contact-us');
  const [blocks, setBlocks] = useState<CmsContentBlock[]>([]);
  const [draftBlock, setDraftBlock] = useState<CmsContentBlock>({ title: '', description: '', image_url: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [faqs, setFaqs] = useState<PageFaq[]>([]);
  const [seo, setSeo] = useState<SeoValues>(defaultSeoValues('page'));
  const [saving, setSaving] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');
  const [publishedAt, setPublishedAt] = useState('');

  useEffect(() => {
    if (!pageId) return;
    fetchCollectionRecords('pages').then((rows) => {
      const page = rows.find(
        (row) => String(pickRecordId(row) ?? '') === String(pageId) || String(row.id) === String(pageId)
      );
      if (!page) return;
      const extras = parseCmsPageExtras(page);
      setTitle(String(page.title || page.name || ''));
      setLayout(extras.layout);
      setHeroTitle(extras.hero_title);
      setSubtitle(extras.subtitle);
      setExcerpt(extras.excerpt || String(page.excerpt || ''));
      setContent(stripEmbeddedContent(String(page.content || page.description || '')));
      setVideoUrl(extras.video_url);
      setDestinations(extras.destinations.join(', ') || ABOUT_DESTINATION_CHIPS.join(', '));
      setFeaturedImage(String(page.image_url || ''));
      setStatus(extras.status);
      setCtaLabel(extras.cta_label || 'Talk to Us');
      setCtaHref(extras.cta_href || '/contact-us');
      setBlocks(parseCmsBlocks(page));
      setFaqs(faqsForEditor(page, 'pages'));
      setSeo(seoValuesFromRecord(page as Record<string, unknown>));
      setPublishedAt(pickDateValue(page, ['published_at', 'created_at']) || extras.published_at);
    });
  }, [pageId]);

  function addBlock() {
    if (!draftBlock.title.trim() && !draftBlock.description.trim()) return;
    setBlocks((current) => {
      if (editingIndex !== null) {
        return current.map((block, index) => (index === editingIndex ? draftBlock : block));
      }
      return [draftBlock, ...current];
    });
    setDraftBlock({ title: '', description: '', image_url: '' });
    setEditingIndex(null);
  }

  async function handleBlockImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadOptimizedImage(file, 'pages');
      setDraftBlock((current) => ({ ...current, image_url: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Block image upload failed.');
    } finally {
      event.target.value = '';
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const stamp = publishedAt || new Date().toISOString();
    const slug = seo.slug || slugify(title);
    const extras = cmsPageFieldPack({
      layout: layout || inferPageLayout(slug),
      hero_title: heroTitle || title,
      subtitle,
      excerpt,
      video_url: videoUrl,
      destinations: destinations.split(',').map((item) => item.trim()).filter(Boolean),
      faqs,
      status,
      cta_label: ctaLabel,
      cta_href: ctaHref,
      published_at: stamp,
    });

    const payload = buildSavePayload(
      'pages',
      {
        title,
        slug,
        image_url: featuredImage.startsWith('blob:') ? '' : featuredImage,
        excerpt,
        layout: extras.layout,
        hero_title: extras.hero_title,
        subtitle: extras.subtitle,
        video_url: extras.video_url,
        destinations: extras.destinations,
        faqs: extras.faqs,
        status,
        cta_label: extras.cta_label,
        cta_href: extras.cta_href,
        page_blocks: JSON.stringify(blocks),
        published_at: stamp,
        content: embedContent(content, {
          blocks,
          fields: extras,
        }),
      },
      { seo: { ...seo, slug, social_image_url: seo.social_image_url || featuredImage } }
    );

    const result = await saveWithColumnFallback('pages', payload, isEdit ? pageId : undefined);
    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    await notifyAdminItemSaved({
      module: 'Page',
      action: isEdit ? 'updated' : 'created',
      item: { ...payload, ...(result.data?.[0] || {}), id: isEdit ? pageId : result.data?.[0]?.id },
    });

    router.push('/admin/pages');
    router.refresh();
  }

  return (
    <form id="cms-page-form" onSubmit={handleSubmit} className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/admin/pages" className="mb-6 inline-block text-sm font-medium text-[#6b7280] hover:text-[#374151]">
        &lt; Back to Pages
      </Link>

      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
        <h1 className="text-center font-serif text-3xl font-bold text-[#111827]">
          {isEdit ? 'Edit Page' : 'Add New Page'}
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[#6b7280]">
          Pages power About, Terms, Privacy, Agency, Community, and Contact SEO. Layout controls how the page appears on
          the live website.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <FieldLabel>Page title</FieldLabel>
            <PillInput
              value={title}
              onChange={(value) => {
                setTitle(value);
                setSeo((current) => ({
                  ...current,
                  seo_title: current.seo_title || value,
                  slug: current.slug || slugify(value),
                  breadcrumb_title: current.breadcrumb_title || value,
                }));
                if (!heroTitle) setHeroTitle(value);
                if (!pageId) setLayout(inferPageLayout(slugify(value)));
              }}
              required
              placeholder="About Us"
            />
          </div>
          <div>
            <FieldLabel>Layout</FieldLabel>
            <SearchableSelect
              value={layout}
              onChange={(value) => setLayout((value as CmsPageLayout) || 'standard')}
              options={PAGE_LAYOUTS.map((item) => ({ value: item.value, label: item.label }))}
              placeholder="Select layout"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <FieldLabel>Hero title</FieldLabel>
            <PillInput value={heroTitle} onChange={setHeroTitle} placeholder="Shown in the banner" />
          </div>
          <div>
            <FieldLabel>Subtitle</FieldLabel>
            <PillInput value={subtitle} onChange={setSubtitle} placeholder="Optional banner line" />
          </div>
        </div>

        <div className="mt-6">
          <FieldLabel>Excerpt (search snippet)</FieldLabel>
          <textarea
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-[#e5e7eb] px-5 py-3 text-sm outline-none focus:border-[#66bb9a]"
            placeholder="One or two sentences for Google and social shares"
          />
        </div>

        <FaqEditor
          faqs={faqs}
          onChange={setFaqs}
          title="Page FAQ"
          description="These are the same FAQs shown on the public page. Edit them here — they stay on the website."
        />

        <div className="mt-6">
          <FieldLabel>Page content</FieldLabel>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Write the page body. Use H4 headings for Who We are / What We do on About."
            minHeight={280}
            showFooter
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <div>
              <FieldLabel>Hero video URL (About layout)</FieldLabel>
              <PillInput value={videoUrl} onChange={setVideoUrl} placeholder="https://...mp4" />
            </div>
            <div>
              <FieldLabel>Destination chips</FieldLabel>
              <textarea
                value={destinations}
                onChange={(event) => setDestinations(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-[#e5e7eb] px-5 py-3 text-sm outline-none focus:border-[#66bb9a]"
                placeholder="Uganda, Kenya, Tanzania, Rwanda"
              />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
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
              <div>
                <FieldLabel>Call to action</FieldLabel>
                <PillInput value={ctaLabel} onChange={setCtaLabel} placeholder="Talk to Us" />
              </div>
            </div>
            <div>
              <FieldLabel>CTA link</FieldLabel>
              <PillInput value={ctaHref} onChange={setCtaHref} placeholder="/contact-us" />
            </div>
          </div>
          <CoverImageField
            className="lg:col-span-2"
            label="Hero image"
            folder="pages"
            value={featuredImage}
            onChange={(url) => {
              setFeaturedImage(url);
              setSeo((current) => ({ ...current, social_image_url: url }));
            }}
          />
        </div>

        <div className="mt-8 rounded-xl bg-[#f3f4f6] p-6">
          <SavedBlocksGrid
            heading="Page blocks"
            blocks={blocks}
            onEdit={(index) => {
              const block = blocks[index];
              if (!block) return;
              setDraftBlock(block);
              setEditingIndex(index);
            }}
            onDelete={(index) => {
              setBlocks((current) => current.filter((_, itemIndex) => itemIndex !== index));
              if (editingIndex === index) {
                setDraftBlock({ title: '', description: '', image_url: '' });
                setEditingIndex(null);
              }
            }}
          />
          <h2 className={`font-serif text-2xl font-bold italic text-[#374151] ${blocks.length > 0 ? 'mt-2' : ''}`}>
            {editingIndex !== null ? 'Edit block' : 'New block'}
          </h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            About and Community layouts use blocks for staggered image + text (Who We are, What We do, initiatives).
          </p>
          <div className="mt-6 space-y-6">
            <div>
              <FieldLabel>Block title</FieldLabel>
              <PillInput
                value={draftBlock.title}
                onChange={(value) => setDraftBlock({ ...draftBlock, title: value })}
                placeholder="Who We are"
              />
            </div>
            <div>
              <FieldLabel>Block description</FieldLabel>
              <RichTextEditor
                value={draftBlock.description}
                onChange={(value) => setDraftBlock({ ...draftBlock, description: value })}
                placeholder="Block copy..."
                minHeight={180}
                showFooter
              />
            </div>
            <div>
              <FieldLabel>Block image</FieldLabel>
              <div className="flex items-center gap-3">
                <input type="file" accept="image/*" onChange={handleBlockImage} className="text-sm" />
                {draftBlock.image_url ? (
                  <span className="truncate text-xs text-[#6b7280]">{draftBlock.image_url}</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end rounded-b-xl bg-[#eceff1] px-4 py-3">
            <button
              type="button"
              onClick={addBlock}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10b981] text-xs font-bold text-white hover:bg-[#059669]"
            >
              {editingIndex !== null ? 'OK' : 'ADD'}
            </button>
          </div>
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        <div className="mt-10 flex justify-center border-t border-[#e5e7eb] pt-10">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#66bb9a] px-10 py-3 text-sm font-semibold text-white transition hover:bg-[#57a85b] disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Page' : 'Create Page'}
          </button>
        </div>
      </div>

      <SeoPanel
        className="mt-6"
        values={seo}
        onChange={setSeo}
        pageTitle={title}
        coverImageUrl={featuredImage.startsWith('blob:') ? '' : featuredImage}
        contentForReadability={`${excerpt}\n${content}\n${blocks.map((block) => block.description).join('\n')}`}
        onSave={() => setSeoSaved(true)}
        saving={saving}
        contentType="page"
      />
      {seoSaved ? null : <p className="sr-only">SEO draft</p>}
    </form>
  );
}
