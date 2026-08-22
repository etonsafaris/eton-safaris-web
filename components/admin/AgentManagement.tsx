'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Eye, Pencil, Trash2, Users, X } from 'lucide-react';
import { adminAuthHeaders, fetchAdminTable } from '@/lib/admin-records-client';
import { fetchBookingsForAgent } from '@/lib/agent-bookings';
import { agentDisplayName, agentIsActive, agentJoinedAt } from '@/lib/find-agent';
import { pickRecordId, pickString } from '@/lib/data';
import { generateBookingCode } from '@/lib/booking-code';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { notifyWorkspace } from '@/lib/notify';
import { SITE } from '@/lib/collections';
import type { RecordRow } from '@/lib/types';

type Filter = 'all' | 'active' | 'inactive' | 'pending';
type ModalMode = 'view' | 'edit';

function formatJoined(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function agentStatus(record: RecordRow) {
  const raw = pickString(record, ['status']).trim();
  if (raw) return raw;
  return agentIsActive(record) ? 'Active' : 'Pending';
}

export default function AgentManagement() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [mode, setMode] = useState<ModalMode>('view');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    company: '',
    company_website: '',
    address: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<RecordRow | null>(null);
  const [guestLogsAgent, setGuestLogsAgent] = useState<RecordRow | null>(null);
  const [guestLogs, setGuestLogs] = useState<RecordRow[]>([]);
  const [guestLogsLoading, setGuestLogsLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRecords(await fetchAdminTable('registered_agents'));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load agents.');
      setRecords([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const verifiedCount = records.filter((row) => agentIsActive(row)).length;
  const pendingCount = records.filter((row) => agentStatus(row).toLowerCase() === 'pending').length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((row) => {
      const status = agentStatus(row).toLowerCase();
      if (filter === 'active' && status !== 'active') return false;
      if (filter === 'inactive' && status !== 'inactive') return false;
      if (filter === 'pending' && status !== 'pending') return false;
      if (!needle) return true;
      const haystack = [
        agentDisplayName(row),
        pickString(row, ['email', 'Email']),
        pickString(row, ['phone', 'phoneNumber']),
        pickString(row, ['country']),
        pickString(row, ['company', 'companyName']),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [records, query, filter]);

  function openModal(record: RecordRow, nextMode: ModalMode) {
    setSelected(record);
    setMode(nextMode);
    setForm({
      name: agentDisplayName(record),
      email: pickString(record, ['email', 'Email']),
      phone: pickString(record, ['phone', 'phoneNumber']),
      country: pickString(record, ['country']),
      company: pickString(record, ['company', 'companyName']),
      company_website: pickString(record, ['company_website', 'companyWebsite', 'website']),
      address: pickString(record, ['address']),
      bio: pickString(record, ['bio']),
    });
  }

  async function setStatus(record: RecordRow, status: 'Active' | 'Inactive' | 'Pending') {
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/agents/status', {
      method: 'POST',
      credentials: 'include',
      headers: await adminAuthHeaders(),
      body: JSON.stringify({
        id: pickRecordId(record) ?? undefined,
        status,
        email: pickString(record, ['email', 'Email']),
        name: agentDisplayName(record),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not update the agent status.');
      return;
    }
    await load();
    if (selected && pickRecordId(selected) === pickRecordId(record)) {
      setSelected({ ...record, status });
    }
  }

  async function saveAgent(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/agents/manage', {
      method: 'POST',
      credentials: 'include',
      headers: await adminAuthHeaders(),
      body: JSON.stringify({
        action: 'update',
        id: pickRecordId(selected) ?? undefined,
        ...form,
        status: agentStatus(selected),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not update this agent.');
      return;
    }
    setSelected(null);
    await load();
  }

  async function deleteAgent() {
    if (!removing) return;
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/agents/manage', {
      method: 'POST',
      credentials: 'include',
      headers: await adminAuthHeaders(),
      body: JSON.stringify({
        action: 'delete',
        id: pickRecordId(removing) ?? undefined,
        email: pickString(removing, ['email', 'Email']),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not delete this agent.');
      return;
    }
    setRemoving(null);
    setSelected(null);
    await load();
  }

  async function viewGuestLogs(record: RecordRow) {
    setGuestLogsAgent(record);
    setGuestLogs([]);
    setGuestLogsLoading(true);
    const email = pickString(record, ['email', 'Email', 'agent_email']);
    if (!email) {
      setGuestLogsLoading(false);
      return;
    }
    try {
      setGuestLogs(await fetchBookingsForAgent(email));
    } catch (logsError) {
      setError(logsError instanceof Error ? logsError.message : 'Could not load guest logs.');
    }
    setGuestLogsLoading(false);
  }

  async function confirmGuest(guest: RecordRow) {
    if (!guest.id) return;
    const guestEmail = pickString(guest, ['email']);
    const guestName = pickString(guest, ['guest_name', 'name']) || guestEmail;
    const code = pickString(guest, ['booking_code']) || generateBookingCode();
    const { error: updateError } = await saveWithColumnFallback(
      'bookings',
      { status: 'Confirmed', booking_code: code },
      guest.id
    );
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setGuestLogs((current) =>
      current.map((row) => (row.id === guest.id ? { ...row, status: 'Confirmed', booking_code: code } : row))
    );
    if (guestEmail) {
      await notifyWorkspace({
        title: 'Booking Confirmed',
        message: `Hi ${guestName}, your safari booking is confirmed. Your booking code is ${code}. Verify anytime at ${SITE.url}/verify`,
        category: 'booking',
        guestEmail,
        sendToGuest: true,
      });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white">Agent Management</h1>
          <p className="mt-1 max-w-2xl text-gray-500 dark:text-gray-400">
            Review and manage your network of travel agents and partners.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[#ecfdf3] px-3 py-1.5 text-sm font-medium text-[#00A651]">
          <Users className="h-4 w-4" />
          {verifiedCount} Verified
        </div>
      </div>

      <div className="rounded-2xl border border-[#d1fae5] bg-[#f0fdf4] p-4 text-sm text-[#14532d]">
        <p className="font-semibold">How admins handle agents</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>A new application arrives as <strong>Pending</strong> after the agent submits `/agents/register`.</li>
          <li>Open the row to review name, company, phone, country, and website.</li>
          <li>Click <strong>Activate Agent</strong> to grant portal access and email the agent.</li>
          <li>Use <strong>Guest Logs</strong> to see guests that agent recorded, then confirm bookings.</li>
          <li>Deactivate or remove an agent if they should no longer book for Eton Safaris.</li>
        </ol>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-200/50 dark:bg-[#161b22] dark:shadow-none">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search agents..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#00A651] dark:border-white/10 dark:bg-white/5 md:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            {([
              ['all', `All (${records.length})`],
              ['pending', `Pending (${pendingCount})`],
              ['active', `Active (${verifiedCount})`],
              ['inactive', 'Inactive'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                  filter === id ? 'bg-[#00A651] text-white' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
            <button type="button" onClick={() => void load()} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase">
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3">Agent / Company</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    Loading agents…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    No agents found.
                  </td>
                </tr>
              ) : (
                visible.map((record, index) => {
                  const status = agentStatus(record);
                  const active = status.toLowerCase() === 'active';
                  return (
                    <tr key={String(pickRecordId(record) ?? index)} className="border-t border-gray-100 dark:border-white/10">
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#111827] dark:text-white">{agentDisplayName(record)}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                          {pickString(record, ['company', 'companyName']) || 'No Company'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {pickString(record, ['email']) ? (
                          <a href={`mailto:${pickString(record, ['email'])}`} className="text-xs font-medium text-[#00A651] hover:underline">
                            {pickString(record, ['email'])}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs text-gray-500">
                        {pickString(record, ['phone', 'phoneNumber']) || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {pickString(record, ['country']) ? (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-white/10">
                            {pickString(record, ['country'])}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tighter ${
                            active
                              ? 'bg-green-100 text-green-700'
                              : status.toLowerCase() === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-600' : 'bg-current'}`} />
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-medium tabular-nums text-gray-400">
                        {formatJoined(agentJoinedAt(record))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <IconButton label="View" onClick={() => openModal(record, 'view')}>
                            <Eye className="h-4 w-4" />
                          </IconButton>
                          <IconButton label="Edit" onClick={() => openModal(record, 'edit')}>
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          <IconButton label="Guest logs" onClick={() => void viewGuestLogs(record)}>
                            <Users className="h-4 w-4" />
                          </IconButton>
                          <IconButton label="Delete" onClick={() => setRemoving(record)}>
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10">
          <form onSubmit={saveAgent} className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#161b22] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {mode === 'view' ? 'Agent profile' : 'Update agent'}
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-[#111827] dark:text-white">{form.name || 'Agent'}</h2>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-4 py-1.5 text-xs font-bold tracking-wider ${
                    agentStatus(selected).toLowerCase() === 'active'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {agentStatus(selected).toUpperCase()}
                </span>
                <button type="button" onClick={() => setSelected(null)} aria-label="Close">
                  <X />
                </button>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              <Field label="Username" value={form.name} readOnly={mode === 'view'} onChange={(value) => setForm({ ...form, name: value })} />
              <Field label="Email Address" type="email" value={form.email} readOnly={mode === 'view'} onChange={(value) => setForm({ ...form, email: value })} />
              <Field label="Phone Number" value={form.phone} readOnly={mode === 'view'} onChange={(value) => setForm({ ...form, phone: value })} />
              <Field label="Country" value={form.country} readOnly={mode === 'view'} onChange={(value) => setForm({ ...form, country: value })} />
              <Field label="Company Name" value={form.company} readOnly={mode === 'view'} onChange={(value) => setForm({ ...form, company: value })} />
              <Field label="Company Website" value={form.company_website} readOnly={mode === 'view'} onChange={(value) => setForm({ ...form, company_website: value })} />
              <Field label="Address" value={form.address} readOnly={mode === 'view'} onChange={(value) => setForm({ ...form, address: value })} />
              <Field label="Bio" value={form.bio} readOnly={mode === 'view'} onChange={(value) => setForm({ ...form, bio: value })} />
            </div>

            <div className="mt-10 flex flex-col gap-4 border-t border-gray-100 pt-8 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500">Status:</span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void setStatus(selected, agentIsActive(selected) ? 'Inactive' : 'Active')}
                  className={`text-sm font-bold ${agentIsActive(selected) ? 'text-red-500' : 'text-green-500'}`}
                >
                  {saving ? 'Updating...' : agentIsActive(selected) ? 'Deactivate Agent' : 'Activate Agent'}
                </button>
              </div>
              <div className="flex items-center gap-6">
                {mode === 'view' ? (
                  <>
                    <button type="button" onClick={() => void viewGuestLogs(selected)} className="text-sm font-bold text-[#00A651]">
                      View Guest Logs
                    </button>
                    <button type="button" onClick={() => setMode('edit')} className="text-sm font-bold text-gray-700">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="rounded-[2rem] bg-gray-100 px-10 py-3 text-sm font-extrabold text-gray-600"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setSelected(null)} className="text-sm font-bold text-gray-500">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-[2rem] bg-[#10b981] px-10 py-3 text-sm font-extrabold text-white shadow-lg disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Update Agent'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {removing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#161b22]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-[#111827] dark:text-white">Remove Agent</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Are you sure you want to remove <span className="font-bold text-[#111827]">{agentDisplayName(removing)}</span> from
              the platform? This action cannot be undone and all associated data will be lost.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setRemoving(null)} className="text-sm font-bold text-gray-500">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void deleteAgent()}
                className="rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {guestLogsAgent && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#161b22]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-2xl dark:text-white">Guest logs · {agentDisplayName(guestLogsAgent)}</h3>
              <button type="button" onClick={() => setGuestLogsAgent(null)} aria-label="Close guest logs">
                <X />
              </button>
            </div>
            {guestLogsLoading ? (
              <p className="text-sm text-gray-500">Loading guest records…</p>
            ) : guestLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No guests recorded by this agent yet.</p>
            ) : (
              <div className="space-y-3">
                {guestLogs.map((guest, index) => (
                  <article key={String(guest.id ?? index)} className="rounded-lg border border-gray-200 px-4 py-3 text-sm dark:border-white/10">
                    <p className="font-semibold dark:text-white">
                      {pickString(guest, ['guest_name', 'name']) || pickString(guest, ['email'])}
                    </p>
                    <p className="text-gray-500">{pickString(guest, ['email'])}</p>
                    <p className="mt-1 text-gray-600">
                      {pickString(guest, ['tour', 'travel_plans']) || 'Tour not set'} · {pickString(guest, ['destination'])} ·{' '}
                      {pickString(guest, ['status']) || 'Pending'}
                    </p>
                    {pickString(guest, ['status']).toLowerCase() !== 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => void confirmGuest(guest)}
                        className="mt-3 rounded-md bg-[#00A651] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Confirm Guest
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[#00A651] dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-gray-500">{label}</span>
      <input
        type={type}
        readOnly={readOnly}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 w-full rounded-2xl border-none bg-gray-50 px-6 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#00A651]/20 dark:bg-[#232d3d] dark:text-white"
      />
    </label>
  );
}
