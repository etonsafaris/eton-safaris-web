'use client';

import { useRef } from 'react';
import { X } from 'lucide-react';

const CHIP_CLIP = { clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' };

export function KeywordChip({
  label,
  onEdit,
  onRemove,
}: {
  label: string;
  onEdit?: () => void;
  onRemove: () => void;
}) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 bg-[#00A651] py-1.5 pl-3.5 pr-2 text-[13px] font-semibold leading-5 text-white"
      style={CHIP_CLIP}
    >
      <button
        type="button"
        className="min-w-0 max-w-[14rem] text-left break-words [overflow-wrap:anywhere]"
        onClick={(event) => {
          event.stopPropagation();
          onEdit?.();
        }}
      >
        {label}
      </button>
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="shrink-0 rounded-sm p-0.5 hover:bg-black/10"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export default function KeywordTagBox({
  tags,
  draft,
  onDraftChange,
  onAdd,
  onEdit,
  onRemove,
  placeholder = 'Type a keyword and press Enter',
  disabled = false,
  minHeightClass = 'min-h-[120px]',
}: {
  tags: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onEdit?: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeightClass?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      role="group"
      onClick={() => inputRef.current?.focus()}
      className={`${minHeightClass} w-full max-w-full cursor-text overflow-hidden rounded-lg border border-[#d1d5db] bg-white p-3 text-left transition focus-within:border-[#00A651] focus-within:ring-2 focus-within:ring-[#00A651]/15`}
    >
      <div className="flex max-w-full flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <KeywordChip
            key={tag}
            label={tag}
            onEdit={onEdit ? () => onEdit(tag) : undefined}
            onRemove={() => onRemove(tag)}
          />
        ))}
        <input
          ref={inputRef}
          value={draft}
          disabled={disabled}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            event.stopPropagation();
            onAdd();
          }}
          placeholder={placeholder}
          className="min-h-[34px] min-w-[8rem] max-w-full flex-1 border-0 bg-transparent py-1 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}
