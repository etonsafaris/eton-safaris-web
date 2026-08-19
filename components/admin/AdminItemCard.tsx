'use client';

import Link from 'next/link';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';

export default function AdminItemCard({
  layout,
  href,
  image,
  badge,
  date,
  title,
  onEdit,
  onDelete,
  extraActions,
}: {
  layout: 'grid' | 'list';
  href?: string | null;
  image?: string;
  badge: string;
  date?: string;
  title: string;
  onEdit: () => void;
  onDelete: () => void;
  extraActions?: React.ReactNode;
}) {
  const actions = (
    <div
      className="relative z-[2] flex items-center gap-2"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {extraActions}
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onEdit();
        }}
        aria-label="Edit"
        className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2a3038] text-white hover:bg-[#3a414b] dark:bg-[#2a3038]"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDelete();
        }}
        aria-label="Delete"
        className="flex h-8 w-8 items-center justify-center rounded-md bg-[#3f1f24] text-red-400 hover:bg-[#5a2a31]"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const readMore = href ? (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#00A651]">
      Read More <ExternalLink className="h-3.5 w-3.5" />
    </span>
  ) : null;

  const imageBlock = (
    <div className={`relative overflow-hidden bg-[#1a1f26] ${layout === 'grid' ? 'aspect-[16/10]' : 'h-full min-h-[140px] w-[220px] shrink-0'}`}>
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-white/30">No image</div>
      )}
      <span className="absolute left-3 top-3 rounded bg-[#00A651] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        {badge}
      </span>
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
      <div className="mt-auto flex items-end justify-between pt-4">
        {readMore || <span />}
        {actions}
      </div>
    </div>
  );

  const className =
    layout === 'grid'
      ? 'group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e7eb] transition hover:-translate-y-0.5 hover:shadow-md dark:bg-[#161b22] dark:ring-white/5'
      : 'group relative flex w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e7eb] transition hover:shadow-md dark:bg-[#161b22] dark:ring-white/5';

  return (
    <article className={`${className} ${href ? 'cursor-pointer' : ''}`}>
      {imageBlock}
      {body}
      {href ? (
        <Link
          href={href}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-0 z-[1]"
          aria-label={`View ${title} on website`}
        />
      ) : null}
    </article>
  );
}
