'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAdminCollectionListHref } from '@/lib/use-admin-list-href';
import CoverImageField from '@/components/admin/CoverImageField';
import FaqEditor from '@/components/admin/FaqEditor';
import HomePageFields from '@/components/admin/HomePageFields';
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
import { blocksWithoutMedia } from '@/lib/content-blocks';
import { canonicalPageSlug } from '@/lib/cms-routes';
import { faqsForEditor } from '@/lib/default-faqs';
import { mergeCommunityInitiativeBlocks } from '@/lib/community-initiatives';
import { ABOUT_DESTINATION_CHIPS } from '@/lib/destination-chips';
import { adjustEditingIndexAfterMove, moveArrayItem } from '@/lib/reorder';
import { fetchCollectionRecordById, pickRecordId, publishStampForSave, recordPublishedAt, slugify } from '@/lib/data';
import { embedContent, extractEmbeddedContent, stripEmbeddedContent } from '@/lib/embedded-content';
import {
  DEFAULT_HOME_PAGE_CONTENT,
  HOME_PAGE_SLUG,
  homePageFieldPack,
  parseHomePageContent,
  type ContactEmail,
  type ContactPhone,
  type SocialLink,
} from '@/lib/home-page-content';
import { hydratePublicCmsPage } from '@/lib/hydrate-cms-page';
import { defaultSeoValues, seoValuesFromRecord, type SeoValues } from '@/lib/seo';
import { buildSavePayload } from '@/lib/supabase-payload';
import { readAdminEditPrefill } from '@/lib/admin-edit-prefill';
import { saveWithColumnFallback } from '@/lib/admin-records-client';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';

type PageFormProps = {
  pageId?: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-[#374151] dark:text-gray-200">{children}</label>
  );
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

export default function PageForm(props: PageFormProps) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading form…</p>}>
      <PageFormInner {...props} />
    </Suspense>
  );
}

function PageFormInner({ pageId }: PageFormProps) {
  const listHref = useAdminCollectionListHref('pages');
  const router = useRouter();
  const isEdit = Boolean(pageId);
  const prefillRow = pageId ? readAdminEditPrefill('pages', pageId) : null;
  const prefillExtras = prefillRow ? parseCmsPageExtras(prefillRow) : null;

  const [title, setTitle] = useState(() =>
    String(prefillRow?.title || prefillRow?.name || prefillRow?.post_title || '')
  );
  const [layout, setLayout] = useState<CmsPageLayout>(() => prefillExtras?.layout || 'standard');
  const [heroTitle, setHeroTitle] = useState(() => String(prefillExtras?.hero_title || ''));
  const [subtitle, setSubtitle] = useState(() => String(prefillExtras?.subtitle || ''));
  const [excerpt, setExcerpt] = useState(() =>
    String(prefillExtras?.excerpt || prefillRow?.excerpt || '')
  );
  const [content, setContent] = useState(() =>
    prefillRow ? stripEmbeddedContent(String(prefillRow.content || prefillRow.description || '')) : ''
  );
  const [videoUrl, setVideoUrl] = useState(() => String(prefillExtras?.video_url || ''));
  const [destinations, setDestinations] = useState(() =>
    prefillExtras?.destinations?.length
      ? prefillExtras.destinations.join(', ')
      : ABOUT_DESTINATION_CHIPS.join(', ')
  );
  const [featuredImage, setFeaturedImage] = useState(() =>
    String(prefillRow?.image_url || prefillRow?.cover_image || '')
  );
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [ctaLabel, setCtaLabel] = useState('Talk to Us');
  const [ctaHref, setCtaHref] = useState('/contact-us');
  const [blocks, setBlocks] = useState<CmsContentBlock[]>([]);
  const [draftBlock, setDraftBlock] = useState<CmsContentBlock>({ title: '', description: '', image_url: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [faqs, setFaqs] = useState<PageFaq[]>(() => (prefillRow ? faqsForEditor(prefillRow, 'pages') : []));
  const [seo, setSeo] = useState<SeoValues>(() =>
    prefillRow ? seoValuesFromRecord(prefillRow as Record<string, unknown>) : defaultSeoValues('page')
  );
  const [saving, setSaving] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');
  const [publishedAt, setPublishedAt] = useState(() => (prefillRow ? recordPublishedAt(prefillRow) : ''));
  const [footerAbout, setFooterAbout] = useState(DEFAULT_HOME_PAGE_CONTENT.footerAbout);
  const [contactAddress, setContactAddress] = useState(DEFAULT_HOME_PAGE_CONTENT.contactAddress);
  const [emails, setEmails] = useState<ContactEmail[]>(DEFAULT_HOME_PAGE_CONTENT.emails);
  const [phones, setPhones] = useState<ContactPhone[]>(DEFAULT_HOME_PAGE_CONTENT.phones);
  const [socials, setSocials] = useState<SocialLink[]>(DEFAULT_HOME_PAGE_CONTENT.socials);

  useEffect(() => {
    if (!pageId) return;
    fetchCollectionRecordById('pages', pageId).then((page) => {
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
      const embedded = extractEmbeddedContent(String(page.content || page.description || ''));
      const storedImage = String(
        page.image_url ||
          page.cover_image ||
          page.featured_image ||
          page.social_image_url ||
          embedded.fields?.image_url ||
          ''
      );
      setFeaturedImage(storedImage);
      setStatus(extras.status);
      setCtaLabel(extras.cta_label || 'Talk to Us');
      setCtaHref(extras.cta_href || '/contact-us');
      const pageSlug = String(page.slug || extras.layout || '');
      if (extras.layout === 'home' || pageSlug === HOME_PAGE_SLUG || /home/i.test(pageSlug)) {
        const home = parseHomePageContent(page);
        setFooterAbout(home.footerAbout);
        setContactAddress(home.contactAddress);
        setEmails(home.emails);
        setPhones(home.phones);
        setSocials(home.socials);
        setBlocks([]);
      } else {
        const canonical =
          canonicalPageSlug(pageSlug) ||
          (extras.layout === 'about'
            ? 'about-us'
            : extras.layout === 'agency'
              ? 'tours-and-travel-agency'
              : extras.layout === 'community'
                ? 'community-support'
                : pageSlug);
        const isEditableStoryPage =
          extras.layout === 'community' ||
          extras.layout === 'about' ||
          extras.layout === 'agency' ||
          /community|about-us|travel-agency|agency/i.test(canonical) ||
          /community|about/i.test(String(page.title || ''));
        const view = hydratePublicCmsPage(page, canonical);
        if (!String(page.image_url || page.cover_image || page.featured_image || page.social_image_url || '').trim() && view.image) {
          setFeaturedImage(view.image);
        }
        const storedBody = stripEmbeddedContent(String(page.content || page.description || ''));
        if (!storedBody.trim() && view.content) setContent(view.content);
        setBlocks(isEditableStoryPage ? view.blocks : parseCmsBlocks(page));
      }
      setFaqs(faqsForEditor(page, 'pages'));
      setSeo(seoValuesFromRecord(page as Record<string, unknown>));
      setPublishedAt(recordPublishedAt(page) || extras.published_at);
    });
  }, [pageId]);

  function addBlock() {
    if (!draftBlock.title.trim() && !draftBlock.description.trim()) return;
    setBlocks((current) => {
      if (editingIndex !== null) {
        return current.map((block, index) => (index === editingIndex ? draftBlock : block));
      }
      return [...current, draftBlock];
    });
    setDraftBlock({ title: '', description: '', image_url: '' });
    setEditingIndex(null);
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((current) => moveArrayItem(current, index, direction));
    setEditingIndex((current) => adjustEditingIndexAfterMove(current, index, direction));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const stamp = publishStampForSave(publishedAt, isEdit);
    const slug =
      layout === 'home' ? HOME_PAGE_SLUG : seo.slug || slugify(title) || '';
    const homePack =
      layout === 'home'
        ? homePageFieldPack({
            footerAbout,
            contactAddress,
            contactEmail: emails.find((email) => email.address.trim())?.address || '',
            emails,
            contactPhone: phones.find((phone) => phone.number.trim())?.number || '',
            phones,
            socials,
          })
        : null;
    const extras = cmsPageFieldPack({
      layout: layout || inferPageLayout(slug),
      hero_title: homePack?.hero_title || heroTitle || title,
      subtitle: homePack?.subtitle || subtitle,
      excerpt: homePack?.excerpt || excerpt,
      video_url: homePack?.video_url || videoUrl,
      destinations: destinations.split(',').map((item) => item.trim()).filter(Boolean),
      faqs,
      status,
      cta_label: ctaLabel,
      cta_href: ctaHref,
      ...(stamp ? { published_at: stamp } : {}),
    });

    const pageBlocks =
      layout === 'home' ? [] : blocksWithoutMedia(blocks, { keepImages: true });
    const payload = buildSavePayload(
      'pages',
      {
        title: layout === 'home' ? 'Home Page' : title,
        slug,
        image_url: featuredImage.startsWith('blob:') ? '' : featuredImage,
        excerpt: extras.excerpt,
        layout: extras.layout,
        hero_title: extras.hero_title,
        subtitle: extras.subtitle,
        video_url: extras.video_url,
        destinations: extras.destinations,
        faqs: extras.faqs,
        status,
        cta_label: extras.cta_label,
        cta_href: extras.cta_href,
        page_blocks: JSON.stringify(pageBlocks),
        published_at: stamp,
        content: embedContent(layout === 'home' ? `<p>${footerAbout}</p>` : content, {
          blocks: pageBlocks,
          fields: {
            ...(homePack ? { ...extras, ...homePack } : extras),
            image_url: featuredImage.startsWith('blob:') ? '' : featuredImage,
          },
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

    router.push(listHref);
  }

  return (
    <form id="cms-page-form" onSubmit={handleSubmit} className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link href={listHref} className="mb-6 inline-block text-sm font-medium text-[#6b7280] hover:text-[#374151]">
        &lt; Back to Pages
      </Link>

      <div className="admin-form-card rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#161b22]">
        <h1 className="text-center font-serif text-3xl font-bold text-[#111827] dark:text-white">
          {isEdit ? 'Edit Page' : 'Add New Page'}
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[#6b7280]">
          Pages power Home, About, Terms, Privacy, Agency, Community, and Contact. Layout controls what you can edit and
          how it appears on the live website.
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
              onChange={(value) => {
                const next = (value as CmsPageLayout) || 'standard';
                setLayout(next);
                if (next === 'home') {
                  setTitle('Home Page');
                  setSeo((current) => ({ ...current, slug: HOME_PAGE_SLUG, breadcrumb_title: 'Home Page' }));
                  setFooterAbout(DEFAULT_HOME_PAGE_CONTENT.footerAbout);
                  setContactAddress(DEFAULT_HOME_PAGE_CONTENT.contactAddress);
                  setEmails(DEFAULT_HOME_PAGE_CONTENT.emails.map((email) => ({ ...email })));
                  setPhones(DEFAULT_HOME_PAGE_CONTENT.phones.map((phone) => ({ ...phone })));
                  setSocials(DEFAULT_HOME_PAGE_CONTENT.socials.map((link) => ({ ...link })));
                }
                if (next === 'community') {
                  setBlocks((current) => (current.length ? current : mergeCommunityInitiativeBlocks([])));
                }
                if (next === 'about' || next === 'agency') {
                  setBlocks((current) =>
                    current.length
                      ? current
                      : hydratePublicCmsPage(
                          null,
                          next === 'about' ? 'about-us' : 'tours-and-travel-agency'
                        ).blocks
                  );
                }
              }}
              options={PAGE_LAYOUTS.map((item) => ({ value: item.value, label: item.label }))}
              placeholder="Select layout"
            />
          </div>
        </div>

        {layout === 'home' ? (
          <>
            <HomePageFields
              footerAbout={footerAbout}
              contactAddress={contactAddress}
              emails={emails}
              phones={phones}
              socials={socials}
              onFooterAbout={setFooterAbout}
              onContactAddress={setContactAddress}
              onEmails={setEmails}
              onPhones={setPhones}
              onSocials={setSocials}
            />
            <div className="mt-8">
              <FaqEditor
                faqs={faqs}
                onChange={setFaqs}
                title="Home page FAQ"
                description="Questions shown at the bottom of the public home page."
              />
            </div>
            <div className="mt-8 max-w-sm">
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
          </>
        ) : (
          <>
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
            heading={
              layout === 'community'
                ? 'Community initiatives'
                : layout === 'about' || layout === 'agency'
                  ? 'About sections'
                  : 'Page blocks'
            }
            blocks={blocks}
            onEdit={(index) => {
              const block = blocks[index];
              if (!block) return;
              setDraftBlock({
                title: block.title,
                description: block.description,
                image_url: block.image_url || '',
              });
              setEditingIndex(index);
            }}
            onDelete={(index) => {
              setBlocks((current) => current.filter((_, itemIndex) => itemIndex !== index));
              if (editingIndex === index) {
                setDraftBlock({ title: '', description: '', image_url: '' });
                setEditingIndex(null);
              } else if (editingIndex !== null && editingIndex > index) {
                setEditingIndex(editingIndex - 1);
              }
            }}
            onMove={moveBlock}
          />
          <h2 className={`font-serif text-2xl font-bold italic text-[#374151] ${blocks.length > 0 ? 'mt-2' : ''}`}>
            {editingIndex !== null
              ? layout === 'community'
                ? 'Edit initiative'
                : layout === 'about' || layout === 'agency'
                  ? 'Edit section'
                  : 'Edit block'
              : layout === 'community'
                ? 'Add initiative'
                : layout === 'about' || layout === 'agency'
                  ? 'Add section'
                  : 'New block'}
          </h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            {layout === 'community'
              ? 'Saved initiatives appear above with their public images. Click a card to edit it, or fill the form below and press ADD for a new one.'
              : layout === 'about' || layout === 'agency'
                ? 'These are the same story sections shown on the public page (for example Who We are and What We do). Click a card to edit title, image, and text.'
                : 'Add optional blocks with a title and description below.'}
          </p>
          <div className="mt-6 space-y-6">
            <div>
              <FieldLabel>
                {layout === 'community'
                  ? 'Initiative title'
                  : layout === 'about' || layout === 'agency'
                    ? 'Section title'
                    : 'Block title'}
              </FieldLabel>
              <PillInput
                value={draftBlock.title}
                onChange={(value) => setDraftBlock({ ...draftBlock, title: value })}
                placeholder={
                  layout === 'community'
                    ? 'Community-Based Tourism'
                    : layout === 'about' || layout === 'agency'
                      ? 'Who We are'
                      : 'Who We are'
                }
              />
            </div>
            <div>
              <FieldLabel>
                {layout === 'community'
                  ? 'Description'
                  : layout === 'about' || layout === 'agency'
                    ? 'Section text'
                    : 'Block description'}
              </FieldLabel>
              <RichTextEditor
                value={draftBlock.description}
                onChange={(value) => setDraftBlock({ ...draftBlock, description: value })}
                placeholder={
                  layout === 'community'
                    ? 'Write the text shown with this initiative on the public Community page'
                    : layout === 'about' || layout === 'agency'
                      ? 'Write the text shown in this About section on the public website'
                      : 'Block copy...'
                }
                minHeight={180}
                showFooter
              />
            </div>
            {layout === 'community' || layout === 'about' || layout === 'agency' ? (
              <CoverImageField
                label={layout === 'community' ? 'Initiative image' : 'Section image'}
                folder="pages"
                value={draftBlock.image_url || ''}
                onChange={(url) => setDraftBlock({ ...draftBlock, image_url: url })}
                previewClassName="h-[180px]"
              />
            ) : null}
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
          </>
        )}

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
        contentForReadability={
          layout === 'home'
            ? `${footerAbout}\n${contactAddress}\n${emails.map((email) => email.address).join('\n')}\n${phones.map((phone) => phone.number).join('\n')}\n${socials`
                .map((link) => link.url)
                .join('\n')}\n${faqs
                .map((item) => `${item.question}\n${item.answer}`)
                .join('\n')}`
            : `${excerpt}\n${content}\n${blocks.map((block) => block.description).join('\n')}`
        }
        onSave={() => setSeoSaved(true)}
        saving={saving}
        contentType="page"
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
