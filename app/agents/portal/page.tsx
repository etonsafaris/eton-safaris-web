'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { agentBookingNote, fetchBookingsForAgent } from '@/lib/agent-bookings';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { notifyWorkspace } from '@/lib/notify';
import type { User } from '@supabase/supabase-js';
import AdminLogoLoader from '@/components/admin/AdminLogoLoader';
import type { RecordRow } from '@/lib/types';

export default function AgentPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [agent, setAgent] = useState<RecordRow | null>(null);
  const [ready, setReady] = useState(false);
  const [guests, setGuests] = useState<RecordRow[]>([]);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({
    guest_name: '',
    email: '',
    tour: '',
    destination: '',
    travel_date: '',
  });
  const [editingId, setEditingId] = useState<string | number | null>(null);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login?next=/agents/portal');
        return;
      }
      setUser(data.session.user);
      const email = data.session.user.email || '';
      const { data: agents } = await supabase.from('registered_agents').select('*').eq('email', email);
      const match = (agents as RecordRow[] | null)?.[0] || null;
      setAgent(match);
      if (match && String(match.status || '').toLowerCase() === 'active') {
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
    const payload = buildSavePayload('bookings', {
      ...form,
      status: editingId ? undefined : 'Pending',
      agent_email: user.email,
      message: agentBookingNote(user.email),
    });
    const result = await saveWithColumnFallback('bookings', payload, editingId || undefined);
    if (result.error) {
      setStatus(result.error.message);
      return;
    }
    if (!editingId) {
      await saveWithColumnFallback(
        'inquiries',
        buildSavePayload('inquiries', {
          title: 'Agents Inquiry',
          name: form.guest_name,
          email: form.email,
          tour: form.tour,
          message: `Agents Inquiry recorded by ${user.email}. Destination: ${form.destination || '—'}. Travel date: ${form.travel_date || '—'}.`,
          status: 'Pending',
        })
      );
      await notifyWorkspace({
        title: 'Agents Inquiry',
        message: `${form.guest_name} (${form.email}) was recorded by agent ${user.email} for ${form.tour || form.destination || 'a safari'}. Quotation should be emailed to the guest.`,
        category: 'inquiry',
        guestEmail: form.email,
      });
    }
    setStatus(editingId ? 'Guest updated.' : 'Guest recorded.');
    setEditingId(null);
    setForm({ guest_name: '', email: '', tour: '', destination: '', travel_date: '' });
    try {
      setGuests(await fetchBookingsForAgent(user.email));
    } catch (error) {
      console.error(error);
    }
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

  const agentStatus = String(agent?.status || 'Pending');
  const active = agentStatus.toLowerCase() === 'active';

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="flex items-center justify-between border-b bg-forest px-6 py-4 text-white">
        <div>
          <p className="font-serif text-xl">Agent Portal</p>
          <p className="text-xs text-white/70">{user?.email}</p>
        </div>
        <button type="button" onClick={signOut} className="rounded-lg bg-white/10 px-3 py-2 text-sm">
          Log out
        </button>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
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
            <h1 className="font-serif text-3xl">Record a guest</h1>
            <form onSubmit={saveGuest} className="mt-6 space-y-3 rounded-xl border bg-white p-6">
              <input
                required
                placeholder="Guest name"
                value={form.guest_name}
                onChange={(event) => setForm({ ...form, guest_name: event.target.value })}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                required
                type="email"
                placeholder="Guest email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                placeholder="Tour"
                value={form.tour}
                onChange={(event) => setForm({ ...form, tour: event.target.value })}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                placeholder="Destination"
                value={form.destination}
                onChange={(event) => setForm({ ...form, destination: event.target.value })}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
              <input
                type="date"
                value={form.travel_date}
                onChange={(event) => setForm({ ...form, travel_date: event.target.value })}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
              <button type="submit" className="rounded-lg bg-moss px-4 py-2 text-sm font-semibold text-white">
                {editingId ? 'Update guest' : 'Save guest'}
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
                    <p className="font-medium">{String(guest.guest_name || guest.email)}</p>
                    <p className="text-gray-500">
                      {String(guest.tour || guest.destination || '')} · {String(guest.status || 'Pending')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(guest.id ?? null);
                        setForm({
                          guest_name: String(guest.guest_name || ''),
                          email: String(guest.email || ''),
                          tour: String(guest.tour || ''),
                          destination: String(guest.destination || ''),
                          travel_date: String(guest.travel_date || '').slice(0, 10),
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
