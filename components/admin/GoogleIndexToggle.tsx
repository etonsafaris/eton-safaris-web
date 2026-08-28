'use client';

import { useState } from 'react';
import { seoValuesFromRecord } from '@/lib/seo';
import type { RecordRow } from '@/lib/types';

type GoogleIndexToggleProps = {
  collectionId: string;
  record: RecordRow;
  compact?: boolean;
  onUpdated?: (record: RecordRow) => void;
};

export default function GoogleIndexToggle({
  collectionId,
  record,
  compact = false,
  onUpdated,
}: GoogleIndexToggleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const enabled = seoValuesFromRecord(record).robots_index;

  async function toggle() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/google-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          id: record.id,
          enabled: !enabled,
        }),
      });
      const body = (await response.json()) as { error?: string; record?: RecordRow };
      if (!response.ok) throw new Error(body.error || 'Could not update Google indexing');
      if (body.record) onUpdated?.(body.record);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update Google indexing');
    } finally {
      setLoading(false);
    }
  }

  if (collectionId === 'landing_pages') {
    return (
      <span
        title="Landing pages are admin preview only and stay out of Google."
        className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#c2410c]"
      >
        Preview only
      </span>
    );
  }

  const label = enabled ? 'Google: ON' : 'Google: OFF';
  const tone = enabled
    ? 'border-[#a7f3d0] bg-[#ecfdf3] text-[#047857] hover:bg-[#d1fae5]'
    : 'border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f8fafc]';

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={loading || record.id == null}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void toggle();
        }}
        title={
          enabled
            ? 'Click to remove this page from Google search (noindex).'
            : 'Click to auto-configure SEO and allow Google indexing.'
        }
        className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition disabled:opacity-50 ${tone} ${
          compact ? '' : 'min-w-[92px]'
        }`}
      >
        {loading ? 'Saving…' : label}
      </button>
      {error ? <span className="max-w-[180px] text-[10px] text-red-600">{error}</span> : null}
    </div>
  );
}
