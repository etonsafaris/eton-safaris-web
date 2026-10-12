'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { adminAuthHeaders, fetchAdminTable } from '@/lib/admin-records-client';
import { pickRecordId, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

function subscriberName(row: RecordRow) {
  const name = pickString(row, ['name', 'full_name', 'username']);
  if (name) return name;
  const email = pickString(row, ['email']);
  return email.includes('@') ? email.split('@')[0] : 'Subscriber';
}

function formatJoined(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const time = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${month} ${day}, ${year} • ${time}`;
}

export default function SubscribersModule() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [removing, setRemoving] = useState<RecordRow | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchAdminTable('subscribers');
      setRecords(
        rows.slice().sort((a, b) =>
          String(b.subscribed_date || b.created_at || b.createdAt || b.created_date || '').localeCompare(
            String(a.subscribed_date || a.created_at || a.createdAt || a.created_date || '')
          )
        )
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load subscribers.');
      setRecords([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((row) => {
      const haystack = [subscriberName(row), pickString(row, ['email']), pickString(row, ['phone', 'phoneNumber'])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [records, query]);

  async function deleteSubscriber() {
    if (!removing) return;
    const id = pickRecordId(removing);
    if (id == null) {
      setError('This subscriber has no id, so it cannot be removed.');
      return;
    }
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/inbox', {
      method: 'POST',
      credentials: 'include',
      headers: await adminAuthHeaders(),
      body: JSON.stringify({ action: 'delete', table: 'subscribers', id }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not remove this subscriber.');
      return;
    }
    setRemoving(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] dark:text-white">Newsletter Subscribers</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 md:text-base">
            Manage your audience and marketing outreach list.
          </p>
        </div>
        <span className="rounded-lg bg-[#ecfdf3] px-3 py-1.5 text-sm font-medium text-[#00A651]">
          {records.length} subscribed
        </span>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-200/50 dark:bg-[#161b22] dark:shadow-none">
        <div className="border-b border-gray-100 p-4 dark:border-white/10">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#00A651] dark:border-white/10 dark:bg-white/5 md:max-w-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Subscribed</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    Loading subscribers…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    {query ? `No subscribers match “${query}”.` : 'No subscribers yet.'}
                  </td>
                </tr>
              ) : (
                visible.map((row, index) => {
                  const email = pickString(row, ['email']);
                  const phone = pickString(row, ['phone', 'phoneNumber']);
                  return (
                    <tr key={String(pickRecordId(row) ?? index)} className="border-t border-gray-100 dark:border-white/10">
                      <td className="px-4 py-3 font-semibold text-[#111827] dark:text-white">{subscriberName(row)}</td>
                      <td className="px-4 py-3">
                        {email ? (
                          <a href={`mailto:${email}`} className="text-[#00A651] hover:underline">
                            {email}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{phone || '—'}</td>
                      <td className="px-4 py-3 text-xs tabular-nums text-gray-400">
                        {formatJoined(String(row.subscribed_date || row.created_at || row.createdAt || row.created_date || ''))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          title="Delete"
                          aria-label="Delete subscriber"
                          onClick={() => setRemoving(row)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {removing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#161b22]">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="h-6 w-6" />
              </div>
              <button type="button" onClick={() => setRemoving(null)} aria-label="Close">
                <X />
              </button>
            </div>
            <h2 className="text-xl font-bold text-[#111827] dark:text-white">Unsubscribe User</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Are you sure you want to remove{' '}
              <span className="font-bold text-[#111827] dark:text-white">
                {subscriberName(removing) || pickString(removing, ['email'])}
              </span>{' '}
              from the newsletter? This will stop all future marketing emails to this address.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setRemoving(null)} className="text-sm font-bold text-gray-500">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void deleteSubscriber()}
                className="rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete Subscriber'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
