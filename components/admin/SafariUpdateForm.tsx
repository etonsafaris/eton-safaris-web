'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useAdminCollectionListHref } from '@/lib/use-admin-list-href';
import { ChevronDown } from 'lucide-react';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SavedBlocksGrid from '@/components/admin/SavedBlocksGrid';
import SeoPanel from '@/components/admin/SeoPanel';
import CoverImageField from '@/components/admin/CoverImageField';
import { fetchCollectionRecordById, isLanguagePost, parseBlocksFromRecord, publishStampForSave, recordPublishedAt, slugify } from '@/lib/data';
import { adjustEditingIndexAfterMove, moveArrayItem } from '@/lib/reorder';
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

type PostBlock = {
  title: string;
  description: string;
  image_url?: string;
};

type SafariUpdateFormProps = {
  postId?: string;
};

const POST_TYPES = ['Standard Posts', 'Language Posts'] as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-medium text-[#374151] dark:text-gray-300">{children}</label>;
}

export default function SafariUpdateForm(props: SafariUpdateFormProps) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading form…</p>}>
      <SafariUpdateFormInner {...props} />
    </Suspense>
  );
}

function SafariUpdateFormInner({ postId }: SafariUpdateFormProps) {
  const listHref = useAdminCollectionListHref('safari_updates');
  const router = useRouter();
  const isEdit = Boolean(postId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefillRow = postId ? readAdminEditPrefill('safari_updates', postId) : null;

  const [postType, setPostType] = useState<(typeof POST_TYPES)[number]>(() =>
    prefillRow && isLanguagePost(prefillRow) ? 'Language Posts' : 'Standard Posts'
  );
  const [postTypeOpen, setPostTypeOpen] = useState(false);
  const [title, setTitle] = useState(() => String(prefillRow?.title || ''));
  const [coverImage, setCoverImage] = useState(() => String(prefillRow?.image_url || ''));
  const [content, setContent] = useState(() =>
    prefillRow ? stripEmbeddedContent(String(prefillRow.content || prefillRow.description || prefillRow.excerpt || '')) : ''
  );
  const [blocks, setBlocks] = useState<PostBlock[]>([]);
  const [draftBlock, setDraftBlock] = useState<PostBlock>({ title: '', description: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [seo, setSeo] = useState<SeoValues>(() =>
    prefillRow ? seoValuesFromRecord(prefillRow as Record<string, unknown>) : defaultSeoValues('article')
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');
  const [publishedAt, setPublishedAt] = useState(() => (prefillRow ? recordPublishedAt(prefillRow) : ''));

  useEffect(() => {
    if (!postId) return;
    fetchCollectionRecordById('safari_updates', postId).then((post) => {
      if (!post) return;

      setTitle(String(post.title || ''));
      setCoverImage(String(post.image_url || ''));
      setContent(stripEmbeddedContent(String(post.content || post.description || '')));
      setPostType(isLanguagePost(post) ? 'Language Posts' : 'Standard Posts');
      setSeo(seoValuesFromRecord(post as Record<string, unknown>));
      setPublishedAt(recordPublishedAt(post));
      setBlocks(parseBlocksFromRecord(post));
    });
  }, [postId]);

  function addBlock() {
    if (!draftBlock.title.trim() && !draftBlock.description.trim()) return;
    const blockPayload = { title: draftBlock.title, description: draftBlock.description };
    setBlocks((current) => {
      if (editingIndex !== null) {
        return current.map((block, index) => (index === editingIndex ? blockPayload : block));
      }
      return [...current, blockPayload];
    });
    setDraftBlock({ title: '', description: '' });
    setEditingIndex(null);
  }

  function editBlock(index: number) {
    const block = blocks[index];
    if (!block) return;
    setDraftBlock({ title: block.title, description: block.description });
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

  async function handleCoverUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadOptimizedImage(file, 'safari-updates');
      setCoverImage(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cover image upload failed.');
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
    const blocksWithoutImages = blocks.map(({ title, description }) => ({ title, description }));
    const payload = buildSavePayload(
      'safari_updates',
      {
        title,
        content: embedContent(content, {
          blocks: blocksWithoutImages,
          fields: {
            ...(stamp ? { published_at: stamp } : {}),
          },
        }),
        excerpt: content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180),
        image_url: coverImage,
        post_blocks: JSON.stringify(blocksWithoutImages),
        post_type: postType === 'Language Posts' ? 'language' : 'standard',
        published_at: stamp,
        slug: seo.slug || slugify(title),
      },
      { seo }
    );

    const result = await saveWithColumnFallback('safari_updates', payload, isEdit ? postId : undefined);

    if (result.error) {
      console.error('[Supabase] Safari update save failed:', result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }

    await notifyAdminItemSaved({
      module: 'Safari Update',
      action: isEdit ? 'updated' : 'created',
      item: { ...payload, ...(result.data?.[0] || {}), id: isEdit ? postId : result.data?.[0]?.id },
    });

    router.push(listHref);
  }

  return (
    <form id="safari-update-form" onSubmit={handleSubmit} className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={listHref}
          className="text-sm font-medium text-[#00A651] hover:text-[#00945a]"
        >
          &lt; Back
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setPostTypeOpen((open) => !open)}
            className={`flex min-w-[160px] items-center justify-between gap-2 rounded-lg border px-4 py-2 text-sm font-medium outline-none transition ${
              postTypeOpen
                ? 'border-[#00A651] ring-2 ring-[#00A651]/20'
                : 'border-[#00A651] text-[#111827] hover:bg-[#f0fdf4]'
            }`}
          >
            {postType}
            <ChevronDown className={`h-4 w-4 text-[#6b7280] transition ${postTypeOpen ? 'rotate-180' : ''}`} />
          </button>
          {postTypeOpen && (
            <>
              <div className="absolute right-0 z-20 mt-1 w-full overflow-hidden rounded-lg border border-[#e5e7eb] bg-white py-1 shadow-lg">
                {POST_TYPES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setPostType(option);
                      setPostTypeOpen(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm hover:bg-[#f0fdf4] ${
                      postType === option ? 'bg-[#ecfdf5] font-medium text-[#00A651]' : 'text-[#374151]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="fixed inset-0 z-10"
                onClick={() => setPostTypeOpen(false)}
                aria-label="Close post type menu"
              />
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#161b22]">
        <h1 className="text-center font-serif text-3xl font-bold text-[#111827] dark:text-white">
          {isEdit ? 'Edit Post' : 'Add New Post'}
        </h1>
        {postType === 'Language Posts' && (
          <p className="mt-3 text-center text-sm text-[#6b7280]">
            Language posts stay off the public journal but remain in the sitemap for search engines.
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div>
            <FieldLabel>Post Title</FieldLabel>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!seo.seo_title) setSeo({ ...seo, seo_title: event.target.value });
              }}
              placeholder=""
              className="w-full rounded-full border-0 bg-[#f3f4f6] px-5 py-3 text-sm text-[#111827] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#00A651]/20 dark:bg-[#0a0c10] dark:text-white dark:focus:bg-[#111318]"
            />
          </div>

          <CoverImageField
            label="Post Cover Image"
            folder="safari-updates"
            value={coverImage}
            onChange={(url) => {
              setCoverImage(url);
              setSeo((current) => ({ ...current, social_image_url: url }));
            }}
            previewClassName="h-[148px]"
          />
        </div>

        <div className="mt-8">
          <FieldLabel>Post Content</FieldLabel>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Write your post content..."
            minHeight={260}
          />
        </div>

        <div className="mt-8 rounded-xl bg-[#f3f4f6] p-6 dark:bg-[#0a0c10]">
          <SavedBlocksGrid
            heading="Post Blocks"
            blocks={blocks}
            onEdit={editBlock}
            onDelete={deleteBlock}
            onMove={moveBlock}
          />

          <h2 className={`font-serif text-2xl italic text-[#374151] ${blocks.length > 0 ? 'mt-2' : ''}`}>
            {editingIndex !== null ? 'Edit Block' : 'New Block'}
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <FieldLabel>Block Title</FieldLabel>
              <input
                value={draftBlock.title}
                onChange={(event) => setDraftBlock({ ...draftBlock, title: event.target.value })}
                className="w-full rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm outline-none transition focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 dark:border-white/10 dark:bg-[#161b22] dark:text-white"
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

          <div className="mt-4 flex justify-end rounded-b-xl bg-[#eceff1] px-4 py-3 dark:bg-[#111318]">
            <button
              type="button"
              onClick={addBlock}
              className="rounded-full bg-[#00A651] px-5 py-1.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#00945a]"
            >
              {editingIndex !== null ? 'Update' : 'Add'}
            </button>
          </div>
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        <div className="mt-10 flex justify-center">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#5ba896] px-10 py-3 text-sm font-semibold text-white transition hover:bg-[#4f9688] disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Post' : 'Create Post'}
          </button>
        </div>
      </div>

      <SeoPanel
        className="mt-6"
        values={seo}
        onChange={setSeo}
        pageTitle={title}
        contentForReadability={content}
        onSave={() => setSeoSaved(true)}
        saving={saving}
        coverImageUrl={coverImage}
        contentType="article"
        indexRecord={{
          title,
          name: title,
          image_url: coverImage.startsWith('blob:') ? '' : coverImage,
        }}
      />
    </form>
  );
}
