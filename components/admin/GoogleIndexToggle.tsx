'use client';

import { useEffect, useRef, useState } from 'react';
import { adminAuthHeaders } from '@/lib/admin-records-client';
import { seoValuesFromRecord } from '@/lib/seo';
import type { RecordRow } from '@/lib/types';

type GoogleIndexToggleProps = {
  collectionId: string;
  record: RecordRow;
  compact?: boolean;
  onUpdated?: (record: RecordRow) => void;
};

function isGoogleEnabled(record: RecordRow) {
  return seoValuesFromRecord(record).robots_index === true;
}

export default function GoogleIndexToggle({
  collectionId,
  record,
  compact = false,
  onUpdated,
}: GoogleIndexToggleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(() => isGoogleEnabled(record));
  const recordId = record.id == null ? '' : String(record.id);
  const skipSyncRef = useRef(false);

  useEffect(() => {
    if (loading || skipSyncRef.current) return;
    setEnabled(isGoogleEnabled(record));
  }, [record, recordId, loading]);

  async function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (loading || record.id == null) return;

    const nextEnabled = !enabled;
    setLoading(true);
    setError('');
    setEnabled(nextEnabled);
    skipSyncRef.current = true;

    try {
      const headers = await adminAuthHeaders();
      const response = await fetch('/api/admin/google-index', {
        method: 'POST',
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          id: record.id,
          enabled: nextEnabled,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        enabled?: boolean;
        record?: RecordRow;
      };
      if (!response.ok) throw new Error(body.error || 'Could not update Google indexing');

      const savedEnabled = typeof body.enabled === 'boolean' ? body.enabled : nextEnabled;
      const saved = {
        ...(body.record || record),
        id: record.id,
        robots_index: savedEnabled,
        // Keep packed flag on the list row so refresh-less UI stays correct.
        seo_schema:
          (body.record && body.record.seo_schema) ||
          record.seo_schema ||
          undefined,
      } as RecordRow;
      setEnabled(savedEnabled);
      onUpdated?.(saved);

      try {
        const { bumpCmsLive } = await import('@/lib/cms-live');
        bumpCmsLive();
        await fetch('/api/admin/revalidate', { method: 'POST', credentials: 'include' });
      } catch {
        /* optional */
      }
    } catch (err) {
      setEnabled(!nextEnabled);
      setError(err instanceof Error ? err.message : 'Could not update Google indexing');
    } finally {
      setLoading(false);
      // Allow parent record sync after the optimistic update settles.
      window.setTimeout(() => {
        skipSyncRef.current = false;
      }, 0);
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
    <div
      className="relative z-[3] flex flex-col items-start gap-1"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        disabled={loading || record.id == null}
        onClick={(event) => void toggle(event)}
        title={
          enabled
            ? 'Click to remove this page from Google search (noindex).'
            : 'Click to allow Google indexing for this page.'
        }
        className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition disabled:opacity-50 ${tone} ${
          compact ? '' : 'min-w-[92px]'
        }`}
      >
        {loading ? 'Saving…' : label}
      </button>
      {error ? <span className="max-w-[180px] text-[10px] leading-tight text-red-600">{error}</span> : null}
    </div>
  );
}
