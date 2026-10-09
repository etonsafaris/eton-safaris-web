'use client';

import { useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';

const CHIP_CLIP = { clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' };

export function KeywordChip({
  label,
  onEdit,
  onRemove,
  dimmed = false,
  pill = false,
}: {
  label: string;
  onEdit?: () => void;
  onRemove: () => void;
  dimmed?: boolean;
  pill?: boolean;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 bg-[#00A651] text-[13px] font-semibold leading-5 text-white ${
        pill ? 'cursor-pointer rounded-full px-2 py-1' : 'py-1.5 pl-3.5 pr-2'
      } ${dimmed ? 'opacity-50' : ''}`}
      style={pill ? undefined : CHIP_CLIP}
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
  onReplace,
  placeholder = 'Type a keyword and press Enter',
  disabled = false,
  minHeightClass = 'min-h-[120px]',
  appearance = 'clip',
}: {
  tags: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onEdit?: (tag: string) => void;
  onReplace?: (previous: string, next: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeightClass?: string;
  appearance?: 'clip' | 'pill';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const pill = appearance === 'pill';

  function cancelEdit() {
    setEditing(null);
    onDraftChange('');
  }

  function commit() {
    const next = draft.trim();
    if (editing) {
      if (next) onReplace?.(editing, next);
      cancelEdit();
      return;
    }
    onAdd();
  }

  function startEdit(tag: string) {
    if (onReplace) {
      setEditing(tag);
      onDraftChange(tag);
      inputRef.current?.focus();
      return;
    }
    onEdit?.(tag);
  }

  return (
    <div
      role="group"
      onClick={() => inputRef.current?.focus()}
      className={`${minHeightClass} w-full max-w-full cursor-text overflow-hidden rounded-lg border border-[#d1d5db] bg-white text-left transition focus-within:border-[#00A651] focus-within:ring-2 focus-within:ring-[#00A651]/15 dark:border-white/10 dark:bg-[#161b22] ${
        pill ? 'min-h-[46px] px-4 py-2' : 'p-3'
      }`}
    >
      <div className="flex max-w-full flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <KeywordChip
            key={tag}
            label={tag}
            pill={pill}
            dimmed={editing === tag}
            onEdit={() => startEdit(tag)}
            onRemove={() => {
              if (editing === tag) cancelEdit();
              onRemove(tag);
            }}
          />
        ))}
        <input
          ref={inputRef}
          value={draft}
          disabled={disabled}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && editing) {
              event.preventDefault();
              cancelEdit();
              return;
            }
            if (event.key !== 'Enter') return;
            event.preventDefault();
            event.stopPropagation();
            commit();
          }}
          placeholder={editing ? 'Edit keyword...' : placeholder}
          className="min-h-[34px] min-w-[8rem] max-w-full flex-1 border-0 bg-transparent p-0 py-1 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] disabled:cursor-not-allowed dark:text-white dark:placeholder:text-gray-500"
        />
        {draft.trim() ? (
          editing ? (
            <span className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Save keyword"
                onClick={(event) => {
                  event.stopPropagation();
                  commit();
                }}
                className="rounded-full p-1 text-green-600 hover:bg-green-50"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Cancel edit"
                onClick={(event) => {
                  event.stopPropagation();
                  cancelEdit();
                }}
                className="rounded-full p-1 text-red-500 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              aria-label="Add keyword"
              onClick={(event) => {
                event.stopPropagation();
                commit();
              }}
              className="rounded-full p-1 text-[#00A651] hover:bg-green-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
