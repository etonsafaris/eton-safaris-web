'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, SquarePen, Trash2 } from 'lucide-react';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

export type ContentBlock = {
  title: string;
  description: string;
};

function previewText(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function SavedBlocksGrid({
  heading = 'Post Blocks',
  blocks,
  onEdit,
  onDelete,
  onMove,
  className = 'mb-8',
  lineClamp = 3,
  itemLabel = 'block',
}: {
  heading?: string;
  blocks: ContentBlock[];
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  /** Move card up (-1) or down (+1). When set, reorder controls appear. */
  onMove?: (index: number, direction: -1 | 1) => void;
  className?: string;
  lineClamp?: number;
  itemLabel?: string;
}) {
  const [pending, setPending] = useState<{ action: 'edit' | 'delete'; index: number } | null>(null);
  const pendingTitle = pending
    ? blocks[pending.index]?.title || `Untitled ${itemLabel}`
    : '';

  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      <h2 className="font-serif text-2xl font-bold text-[#1e293b]">
        {heading} ({blocks.length})
      </h2>
      {onMove && blocks.length > 1 ? (
        <p className="mt-1 text-sm text-[#6b7280]">
          Use the arrows to change order — this order is what guests see on the public page.
        </p>
      ) : null}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {blocks.map((block, index) => {
          const preview = previewText(block.description);
          return (
            <article
              key={`${block.title}-${index}`}
              className="flex min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm"
            >
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d1fae5] text-xs font-bold text-[#047857]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base font-bold leading-snug text-[#1e293b]">
                      {block.title || `Untitled ${itemLabel}`}
                    </h3>
                    {preview && (
                      <p
                        className="mt-1 text-sm leading-relaxed text-[#6b7280]"
                        style={
                          lineClamp > 0
                            ? {
                                display: '-webkit-box',
                                WebkitLineClamp: lineClamp,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }
                            : undefined
                        }
                      >
                        {preview}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f3f4f6] pt-3">
                  {onMove ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={(event) => {
                          event.stopPropagation();
                          onMove(index, -1);
                        }}
                        className="rounded-md p-1.5 text-[#047857] hover:bg-[#ecfdf5] disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Move ${itemLabel} ${index + 1} up`}
                        title="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index >= blocks.length - 1}
                        onClick={(event) => {
                          event.stopPropagation();
                          onMove(index, 1);
                        }}
                        className="rounded-md p-1.5 text-[#047857] hover:bg-[#ecfdf5] disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Move ${itemLabel} ${index + 1} down`}
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPending({ action: 'edit', index });
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-[#00A651] hover:bg-[#ecfdf5]"
                      aria-label={`Edit ${itemLabel} ${index + 1}`}
                      title="Edit"
                    >
                      <SquarePen className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPending({ action: 'delete', index });
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-[#ef4444] hover:bg-red-50"
                      aria-label={`Delete ${itemLabel} ${index + 1}`}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <AdminConfirmDialog
        open={pending?.action === 'edit'}
        title="Edit"
        message={`Edit “${pendingTitle}”?`}
        confirmLabel="Edit"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const index = pending?.index;
          setPending(null);
          if (index != null) onEdit(index);
        }}
      />
      <AdminConfirmDialog
        open={pending?.action === 'delete'}
        title="Delete"
        message={`Delete “${pendingTitle}”? This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const index = pending?.index;
          setPending(null);
          if (index != null) onDelete(index);
        }}
      />
    </div>
  );
}
