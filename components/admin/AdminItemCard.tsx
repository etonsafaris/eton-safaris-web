'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import { cardImageSrc } from '@/lib/responsive-image';

export default function AdminItemCard({
  layout,
  href,
  image,
  badge,
  indexBadge,
  date,
  title,
  keywords = [],
  onEdit,
  onDelete,
  extraActions,
}: {
  layout: 'grid' | 'list';
  href?: string | null;
  image?: string;
  badge: string;
  indexBadge?: React.ReactNode;
  date?: string;
  title: string;
  keywords?: string[];
  onEdit: () => void;
  onDelete: () => void;
  extraActions?: React.ReactNode;
}) {
  const [confirmAction, setConfirmAction] = useState<'edit' | 'delete' | null>(null);

  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
      {extraActions}
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setConfirmAction('edit');
        }}
        title="Edit"
        aria-label={`Edit ${title}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2a3038] px-2.5 text-xs font-semibold text-white hover:bg-[#3a414b]"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setConfirmAction('delete');
        }}
        title="Delete"
        aria-label={`Delete ${title}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#3f1f24] px-2.5 text-xs font-semibold text-red-300 hover:bg-[#5a2a31]"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </div>
  );

  const readMore = href ? (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#00A651] hover:underline"
    >
      Read More <ExternalLink className="h-3.5 w-3.5" />
    </Link>
  ) : null;

  const imageBlock = (
    <div className={`relative overflow-hidden bg-[#e8ece9] ${layout === 'grid' ? 'aspect-[16/10]' : 'h-full min-h-[140px] w-[220px] shrink-0'}`}>
      {image ? (
        <img src={cardImageSrc(image)} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-gray-400">No image</div>
      )}
      <span className="absolute left-3 top-3 rounded bg-[#00A651] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        {badge}
      </span>
      {indexBadge ? <div className="absolute right-3 top-3">{indexBadge}</div> : null}
    </div>
  );

  const body = (
    <div className={`flex min-w-0 flex-1 flex-col ${layout === 'grid' ? 'p-4' : 'p-5'}`}>
      {date ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400">
          {layout === 'list' ? <span className="mr-2 text-[#00A651]">•</span> : null}
          {date}
        </p>
      ) : null}
      <h3 className={`mt-2 font-bold leading-snug text-[#111827] dark:text-white ${layout === 'list' ? 'font-serif text-xl' : 'text-base'}`}>
        {title}
      </h3>
      {keywords.length > 0 ? (
        <p className="mt-2 line-clamp-2 text-xs text-gray-500" title={keywords.join(', ')}>
          Keywords: {keywords.join(', ')}
        </p>
      ) : null}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        {readMore || <span />}
        {actions}
      </div>
    </div>
  );

  const className =
    layout === 'grid'
      ? 'flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e7eb] dark:bg-[#161b22] dark:ring-white/5'
      : 'flex w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e7eb] dark:bg-[#161b22] dark:ring-white/5';

  return (
    <article className={className}>
      {imageBlock}
      {body}
      <AdminConfirmDialog
        open={confirmAction === 'edit'}
        title="Edit"
        message={`Edit “${title}”?`}
        confirmLabel="Edit"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          onEdit();
        }}
      />
      <AdminConfirmDialog
        open={confirmAction === 'delete'}
        title="Delete"
        message={`Delete “${title}”? This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          onDelete();
        }}
      />
    </article>
  );
}
