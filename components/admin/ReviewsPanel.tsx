'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Star, Trash2, X } from 'lucide-react';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { statusBadgeClass } from '@/components/admin/OpsRecordTable';
import { deleteAdminRecord, fetchAdminTable } from '@/lib/admin-records-client';
import { pickDateValue, pickNumber, pickRecordId, pickString } from '@/lib/data';
import { REVIEW_SOURCE_LABELS, isWebsiteReview, reviewClickHref } from '@/lib/review-links';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/admin-records-client';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';
import type { RecordRow } from '@/lib/types';

type TabId = 'website' | 'external' | 'all';

export default function ReviewsPanel() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [tab, setTab] = useState<TabId>('website');
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [form, setForm] = useState({
    author: '',
    email: '',
    country: '',
    title: '',
    rating: '5',
    source: 'Website',
    source_url: '',
    content: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  async function load() {
    try {
      const data = await fetchAdminTable('reviews');
      setRows(
        data.slice().sort((a, b) => pickDateValue(b, ['created_at']).localeCompare(pickDateValue(a, ['created_at'])))
      );
    } catch (err) {
      console.error(err);
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const websiteRows = useMemo(() => rows.filter(isWebsiteReview), [rows]);
  const externalRows = useMemo(() => rows.filter((row) => !isWebsiteReview(row)), [rows]);
  const filtered = tab === 'website' ? websiteRows : tab === 'external' ? externalRows : rows;

  const average =
    filtered.reduce((sum, row) => sum + pickNumber(row, ['rating'], 0), 0) / Math.max(1, filtered.length);

  function openEdit(row: RecordRow) {
    setEditing(row);
    setForm({
      author: pickString(row, ['author']),
      email: pickString(row, ['email']),
      country: pickString(row, ['country', 'country_of_residence']),
      title: pickString(row, ['title']),
      rating: String(pickNumber(row, ['rating'], 5)),
      source: pickString(row, ['source']) || 'Website',
      source_url: pickString(row, ['source_url']),
      content: pickString(row, ['content', 'review']),
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing?.id) return;
    setSaving(true);
    const payload = buildSavePayload('reviews', {
      ...form,
      rating: Number(form.rating),
    });
    const { error: updateError, data } = await saveWithColumnFallback('reviews', payload, editing.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await notifyAdminItemSaved({
      module: 'Review',
      action: 'updated',
      item: { ...payload, ...(data?.[0] || {}), id: editing.id },
    });
    setEditing(null);
    await load();
  }

  async function remove(row: RecordRow) {
    const id = pickRecordId(row);
    if (id == null || !confirm('Delete this review?')) return;
    setDeletingId(String(id));
    setError('');
    try {
      await deleteAdminRecord('reviews', id);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this review.');
    }
    setDeletingId('');
  }

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'website', label: 'Website Reviews', count: websiteRows.length },
    { id: 'external', label: 'External Platforms', count: externalRows.length },
    { id: 'all', label: 'All Reviews', count: rows.length },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-3xl font-bold text-[#111827] dark:text-white">Reviews</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Website submissions show guest name, email, country of residence, and experience note. External reviews keep their source links.
          </p>
        </div>
        <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-medium text-moss">
          {filtered.length} reviews · {average.toFixed(1)} / 5
        </span>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                active
                  ? 'bg-[#6b7c3a] text-white'
                  : 'border border-[#e5e7eb] bg-white text-[#4b5563] hover:bg-[#f9fafb]'
              }`}
            >
              {item.label} ({item.count})
            </button>
          );
        })}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm dark:border-white/10 dark:bg-[#161b22]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-wide text-[#6b7280] dark:bg-white/5 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Country of residence</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Experience / note</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    {tab === 'website'
                      ? 'No website reviews yet. Guests submit them from tour pages.'
                      : 'No reviews in this view.'}
                  </td>
                </tr>
              ) : (
                filtered.map((row, index) => {
                  const href = reviewClickHref(row);
                  return (
                    <tr key={String(row.id ?? index)} className="border-t border-[#eef0f3] dark:border-white/5">
                      <td className="px-4 py-3 font-medium">{pickString(row, ['author', 'name']) || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{pickString(row, ['email']) || '—'}</td>
                      <td className="px-4 py-3">{pickString(row, ['country', 'country_of_residence']) || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Star className="h-4 w-4 fill-current" /> {pickNumber(row, ['rating'], 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(
                            pickString(row, ['source']) || 'Website'
                          )}`}
                        >
                          {pickString(row, ['source']) || 'Website'}
                        </span>
                      </td>
                      <td className="max-w-[320px] px-4 py-3">
                        <p className="line-clamp-3 text-gray-600 dark:text-gray-400">
                          {pickString(row, ['content', 'review']) || '—'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                        {formatPublishedDate(pickDateValue(row, ['created_at']))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {href ? (
                            <a href={href} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#00A651]">
                              View source
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            aria-label="Edit"
                            className="rounded-lg border p-1.5 text-gray-500 hover:text-[#00A651]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(row)}
                            disabled={deletingId === String(pickRecordId(row))}
                            aria-label="Delete"
                            className="rounded-lg border border-red-200 p-1.5 text-red-500 disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10">
          <form onSubmit={save} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#161b22]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-2xl">Edit review</h3>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close">
                <X />
              </button>
            </div>
            <div className="grid gap-3">
              <input
                required
                value={form.author}
                onChange={(event) => setForm({ ...form, author: event.target.value })}
                placeholder="Guest name"
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="Email"
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                value={form.country}
                onChange={(event) => setForm({ ...form, country: event.target.value })}
                placeholder="Country of residence"
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Title / tour"
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                type="number"
                min="1"
                max="5"
                value={form.rating}
                onChange={(event) => setForm({ ...form, rating: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <select
                value={form.source}
                onChange={(event) => setForm({ ...form, source: event.target.value })}
                className="rounded-lg border px-3 py-2.5 text-sm"
              >
                {REVIEW_SOURCE_LABELS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <input
                value={form.source_url}
                onChange={(event) => setForm({ ...form, source_url: event.target.value })}
                placeholder="Source URL (external platforms)"
                className="rounded-lg border px-3 py-2.5 text-sm"
              />
              <textarea
                required
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                placeholder="Experience / note shared"
                className="h-28 rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-[#00A651] px-5 py-2.5 font-semibold text-white">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
