'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { findPublicAgentByEmail } from '@/lib/agent-register';
import { agentDisplayName, agentIsActive } from '@/lib/find-agent';
import { isOwnerAdminEmail } from '@/lib/inbox';
import { agentBookingNote, fetchBookingsForAgent } from '@/lib/agent-bookings';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { notifyWorkspace } from '@/lib/notify';
import { pickString } from '@/lib/data';
import type { User } from '@supabase/supabase-js';
import AdminLogoLoader from '@/components/admin/AdminLogoLoader';
import type { RecordRow } from '@/lib/types';

const emptyForm = {
  guest_name: '',
  email: '',
  phone: '',
  tour: '',
  destination: '',
  travel_date: '',
  travel_plans: '',
  guests: '',
};

export default function AgentPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [agent, setAgent] = useState<RecordRow | null>(null);
  const [ready, setReady] = useState(false);
  const [guests, setGuests] = useState<RecordRow[]>([]);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login?next=/agents/portal');
        return;
      }
      setUser(data.session.user);
      const email = data.session.user.email || '';
      if (isOwnerAdminEmail(email)) {
        router.replace('/admin');
        return;
      }
      const match = await findPublicAgentByEmail(email);
      setAgent(match);
      if (match && agentIsActive(match)) {
        try {
          setGuests(await fetchBookingsForAgent(email));
        } catch (error) {
          console.error(error);
          setGuests([]);
        }
      }
      setReady(true);
    }
    init();
  }, [router]);

  async function saveGuest(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.email) return;
    setSaving(true);
    const payload = buildSavePayload('bookings', {
      ...form,
      status: editingId ? undefined : 'Pending',
      agent_email: user.email,
      message: agentBookingNote(user.email),
    });
    const result = await saveWithColumnFallback('bookings', payload, editingId || undefined);
    if (result.error) {
      setStatus(result.error.message);
      setSaving(false);
      return;
    }
    if (!editingId) {
      const agentLabel = agent ? agentDisplayName(agent) : user.email;
      const inquiryMessage = [
        `Inquiry from the agent ${agentLabel} (${user.email}).`,
        `Guest: ${form.guest_name}`,
        `Email: ${form.email}`,
        `Phone: ${form.phone || '—'}`,
        `Guests: ${form.guests || '—'}`,
        `Tour: ${form.tour || '—'}`,
        `Destination: ${form.destination || '—'}`,
        `Travel date: ${form.travel_date || '—'}`,
        `Travel plans: ${form.travel_plans || '—'}`,
      ].join('\n');
      const inquiry = {
        title: 'Inquiry from the agent',
        name: form.guest_name,
        email: form.email,
        phone: form.phone,
        tour: form.tour || form.destination,
        destination: form.destination,
        guests: form.guests,
        travel_date: form.travel_date,
        agent_email: user.email,
        source: 'agent',
        message: inquiryMessage,
        status: 'Pending',
      };
      let inquiryResult = await saveWithColumnFallback('inquiries', buildSavePayload('inquiries', inquiry));
      if (inquiryResult.error) {
        inquiryResult = await saveWithColumnFallback(
          'quotations_inquiries',
          buildSavePayload('quotations_inquiries', inquiry)
        );
      } else {
        await saveWithColumnFallback('quotations_inquiries', buildSavePayload('quotations_inquiries', inquiry));
      }
      await notifyWorkspace({
        title: 'Inquiry from the agent',
        message: inquiryMessage,
        category: 'inquiry',
        guestEmail: form.email,
        emailAdmin: true,
        recordDashboard: true,
        sendToGuest: false,
      });
    }
    setStatus(editingId ? 'Guest updated.' : 'Guest recorded.');
    setEditingId(null);
    setForm(emptyForm);
    try {
      setGuests(await fetchBookingsForAgent(user.email));
    } catch (error) {
      console.error(error);
    }
    setSaving(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <AdminLogoLoader label="Loading portal" />
      </div>
    );
  }

  const active = agent ? agentIsActive(agent) : false;
  const agentStatus = active ? 'Active' : String(agent?.status || 'Pending');
  const pendingGuests = guests.filter((row) => pickString(row, ['status']).toLowerCase() !== 'confirmed').length;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="flex items-center justify-between border-b bg-forest px-6 py-4 text-white">
        <div>
          <p className="font-serif text-xl">Agent Portal</p>
          <p className="text-xs text-white/70">
            {agent ? agentDisplayName(agent) : String(user?.email || '')}
          </p>
        </div>
        <button type="button" onClick={signOut} className="rounded-lg bg-white/10 px-3 py-2 text-sm">
          Log out
        </button>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10">
        {!agent && (
          <p className="rounded-xl border bg-white p-6 text-sm text-gray-600">
            No agent profile is linked to this account. Register at /agents/register and wait for activation.
          </p>
        )}
        {agent && !active && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <p className="font-semibold text-amber-900">Please wait for admin approval</p>
            <p className="mt-2 text-sm text-amber-800">
              Your agent account is {agentStatus}. An administrator must click Activate before you can record guests. You
              will also receive an email when access is granted.
            </p>
          </div>
        )}
        {active && (
          <>
            <div className="mb-8 grid gap-3 sm:grid-cols-3">
              <Stat label="Recorded guests" value={String(guests.length)} />
              <Stat label="Open bookings" value={String(pendingGuests)} />
              <Stat label="Company" value={String(agent?.company || agent?.companyName || '—')} />
            </div>
            <h1 className="font-serif text-3xl">Record a guest</h1>
            <p className="mt-1 text-sm text-gray-500">
              Submit the traveler details. Eton Safaris will send the quotation and the booking will appear in your guest
              logs.
            </p>
            <form onSubmit={saveGuest} className="mt-6 space-y-4 rounded-2xl border bg-white p-6 shadow-card">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Guest name" required value={form.guest_name} onChange={(value) => setForm({ ...form, guest_name: value })} />
                <Field label="Guest email" type="email" required value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                <Field label="Guest phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
                <Field label="Number of guests" value={form.guests} onChange={(value) => setForm({ ...form, guests: value })} />
                <Field label="Tour" value={form.tour} onChange={(value) => setForm({ ...form, tour: value })} />
                <Field label="Destination" value={form.destination} onChange={(value) => setForm({ ...form, destination: value })} />
                <Field label="Travel date" type="date" value={form.travel_date} onChange={(value) => setForm({ ...form, travel_date: value })} />
              </div>
              <label className="block text-xs font-bold text-gray-500">
                Travel plans
                <textarea
                  value={form.travel_plans}
                  onChange={(event) => setForm({ ...form, travel_plans: event.target.value })}
                  placeholder="Preferred parks, lodge style, special requests"
                  className="mt-2 h-28 w-full rounded-2xl border-none bg-gray-50 px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-moss/20"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="rounded-[2rem] bg-[#10b981] px-10 py-3 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Update guest' : 'Save guest'}
              </button>
              {status && <p className="text-sm text-moss">{status}</p>}
            </form>
            <h2 className="mt-10 font-semibold">Your recorded guests</h2>
            <div className="mt-4 space-y-2">
              {guests.length === 0 ? (
                <p className="text-sm text-gray-500">No guests recorded yet.</p>
              ) : (
                guests.map((guest, index) => (
                  <div key={String(guest.id ?? index)} className="rounded-lg border bg-white px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{String(guest.guest_name || guest.email)}</p>
                        <p className="text-gray-500">
                          {String(guest.tour || guest.destination || guest.travel_plans || '')} ·{' '}
                          {String(guest.status || 'Pending')}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                          String(guest.status || '').toLowerCase() === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {String(guest.status || 'Pending')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(guest.id ?? null);
                        setForm({
                          guest_name: String(guest.guest_name || ''),
                          email: String(guest.email || ''),
                          phone: String(guest.phone || ''),
                          tour: String(guest.tour || ''),
                          destination: String(guest.destination || ''),
                          travel_date: String(guest.travel_date || '').slice(0, 10),
                          travel_plans: String(guest.travel_plans || guest.message || ''),
                          guests: String(guest.guests || ''),
                        });
                      }}
                      className="mt-2 text-xs font-semibold text-moss"
                    >
                      Edit guest
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#111827]">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-xs font-bold text-gray-500">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-14 w-full rounded-2xl border-none bg-gray-50 px-6 text-sm outline-none focus:ring-2 focus:ring-moss/20"
      />
    </label>
  );
}
