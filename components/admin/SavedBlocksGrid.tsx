'use client';

import { SquarePen, Trash2 } from 'lucide-react';

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
  className = 'mb-8',
  lineClamp = 3,
}: {
  heading?: string;
  blocks: ContentBlock[];
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  className?: string;
  lineClamp?: number;
}) {
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      <h2 className="font-serif text-2xl font-bold text-[#1e293b]">
        {heading} ({blocks.length})
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {blocks.map((block, index) => {
          const preview = previewText(block.description);
          return (
            <article
              key={`${block.title}-${index}`}
              className="flex flex-col rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d1fae5] text-xs font-bold text-[#047857]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-base font-bold leading-snug text-[#1e293b]">
                    {block.title || 'Untitled block'}
                  </h3>
                  {preview && (
                    <p
                      className="mt-1 text-sm leading-relaxed text-[#6b7280]"
                      style={lineClamp > 0 ? { display: '-webkit-box', WebkitLineClamp: lineClamp, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
                    >
                      {preview}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#f3f4f6] pt-3">
                <button
                  type="button"
                  onClick={() => onEdit(index)}
                  className="rounded-md p-1.5 text-[#00A651] hover:bg-[#ecfdf5]"
                  aria-label={`Edit block ${index + 1}`}
                >
                  <SquarePen className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(index)}
                  className="rounded-md p-1.5 text-[#ef4444] hover:bg-red-50"
                  aria-label={`Delete block ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
