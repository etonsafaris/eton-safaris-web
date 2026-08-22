'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import AgentManagement from '@/components/admin/AgentManagement';
import CollectionManager from '@/components/admin/CollectionManager';
import KeywordsPanel from '@/components/admin/KeywordsPanel';
import ReviewsPanel from '@/components/admin/ReviewsPanel';
import QuotationPanel from '@/components/admin/QuotationPanel';
import { getCollection, MAIN_COLLECTIONS } from '@/lib/collections';
import { supabase } from '@/lib/supabase/client';
import { notifyWorkspace } from '@/lib/notify';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

export default function AdminCollectionPage() {
  const params = useParams<{ collection: string }>();
  const router = useRouter();
  const collection = params?.collection || '';
  const config = getCollection(collection);

  useEffect(() => {
    if (collection === 'overview') {
      router.replace('/admin');
    }
    if (collection === 'inquiries') {
      router.replace('/admin/quotations_inquiries');
    }
  }, [collection, router]);

  if (collection === 'overview' || collection === 'inquiries') {
    return null;
  }

  if (collection === 'profile') return <ProfilePanel />;
  if (collection === 'settings') return <SettingsPanel />;
  if (collection === 'user_management') return <UserManagement />;
  if (collection === 'keywords') return <KeywordsPanel />;
  if (collection === 'reviews') return <ReviewsPanel />;
  if (collection === 'quotations_inquiries') return <QuotationPanel />;
  if (collection === 'registered_agents') return <AgentManagement />;

  return <CollectionManager key={config.id} config={config} />;
}

function ProfilePanel() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email || '');
      setFullName(String(user.user_metadata?.full_name || ''));
      setPhone(String(user.user_metadata?.phone || ''));
    });
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    const metadata: Record<string, string | boolean> = { full_name: fullName, phone };
    if (password) {
      metadata.must_change_password = false;
      metadata.password_changed_at = new Date().toISOString();
    }
    const updates: { data: Record<string, string | boolean>; email?: string; password?: string } = {
      data: metadata,
    };
    if (email) updates.email = email;
    if (password) updates.password = password;
    const { error } = await supabase.auth.updateUser(updates);
    if (error) {
      setStatus(error.message);
      setSaving(false);
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (userId) {
      const profilePayload = {
        email,
        full_name: fullName,
        phone,
        ...(password ? { must_change_password: false } : {}),
      };
      const updated = await saveWithColumnFallback('profiles', profilePayload, userId);
      if (updated.error) {
        await saveWithColumnFallback('profiles', { id: userId, ...profilePayload }, { keepId: true });
      }
    }
    setPassword('');
    setSaving(false);
    setStatus('Profile Updated Successfully');
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-4 rounded-xl border bg-white p-6">
      <h2 className="font-serif text-3xl">Profile</h2>
      <p className="text-sm text-gray-500">Update your account details and password.</p>
      <input
        required
        placeholder="Name"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        className="w-full rounded-lg border px-3 py-2.5 text-sm"
      />
      <input
        required
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full rounded-lg border px-3 py-2.5 text-sm"
      />
      <input
        placeholder="Contact info"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        className="w-full rounded-lg border px-3 py-2.5 text-sm"
      />
      <input
        type="password"
        placeholder="Change password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="w-full rounded-lg border px-3 py-2.5 text-sm"
      />
      <button type="submit" disabled={saving} className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white">
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
      {status && <p className="text-sm text-moss">{status}</p>}
    </form>
  );
}

function SettingsPanel() {
  const [status, setStatus] = useState<{ pesapal: boolean; resend: boolean; pesapalEnv: string; adminEmail: string } | null>(null);
  const [demoStatus, setDemoStatus] = useState('');
  const [demoSending, setDemoSending] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      fetch('/api/settings/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((response) => response.json())
        .then(setStatus)
        .catch((error) => console.error(error));
    });
  }, []);

  async function sendDemoEmail() {
    setDemoSending(true);
    setDemoStatus('');
    try {
      const response = await fetch('/api/email/test-inquiry', { method: 'POST' });
      const body = (await response.json()) as { emailed?: boolean; error?: string; reason?: string; to?: string[] };
      if (body.emailed) {
        setDemoStatus(`Demo sent to ${(body.to || ['etonsafaris@gmail.com']).join(', ')}. Check Gmail and spam.`);
      } else {
        setDemoStatus(body.error || body.reason || 'Email provider is not connected yet.');
      }
    } catch (error) {
      setDemoStatus(error instanceof Error ? error.message : 'Could not send the demo email.');
    } finally {
      setDemoSending(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="font-serif text-3xl">Settings</h2>
      <p className="text-sm text-gray-500">
        Keys stay in environment variables. Add them in `.env.local` or your host dashboard, then restart the app.
      </p>
      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-medium">Notifications</h3>
        <p className="mt-1 text-sm text-gray-500">
          Admin alerts go to {status?.adminEmail || 'etonsafaris@gmail.com'}. Email sending is{' '}
          {status?.resend ? 'connected via Resend.' : 'delivering to Gmail through the website inbox relay until RESEND_API_KEY is set.'}
        </p>
        <button
          type="button"
          onClick={sendDemoEmail}
          disabled={demoSending}
          className="mt-3 rounded-md bg-[#20A048] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {demoSending ? 'Sending demo…' : 'Send demo email to etonsafaris@gmail.com'}
        </button>
        {demoStatus ? <p className="mt-2 text-sm text-gray-600">{demoStatus}</p> : null}
      </div>
      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-medium">Pesapal checkout</h3>
        <p className="mt-1 text-sm text-gray-500">
          Environment: {status?.pesapalEnv || 'sandbox'}. Merchant keys are{' '}
          {status?.pesapal ? 'present.' : 'not set yet — checkout will record locally and show the missing-key error until you add them.'}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Required: PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET, PESAPAL_ENV=live, optional PESAPAL_IPN_ID.
        </p>
      </div>
      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-medium">Monthly newsletter</h3>
        <p className="mt-1 text-sm text-gray-500">
          Subscribers receive a digest of popular tours and safari updates on the 1st of each month via{' '}
          <code>/api/cron/newsletter</code>. Set CRON_SECRET so only the scheduler can trigger it.
        </p>
      </div>
      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-medium">Google Calendar</h3>
        <p className="mt-1 text-sm text-gray-500">
          New bookings generate a Google Calendar template link and an `.ics` download at `/api/calendar`.
        </p>
      </div>
      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-medium">Security</h3>
        <p className="mt-1 text-sm text-gray-500">Admin sessions auto-logout after 30 minutes of inactivity.</p>
      </div>
    </div>
  );
}

function UserManagement() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Limited Access (User)');
  const [status, setStatus] = useState('');
  const [users, setUsers] = useState<RecordRow[]>([]);
  const [viewerRole, setViewerRole] = useState('');
  const modules = MAIN_COLLECTIONS.filter((item) => item.id !== 'overview').map((item) => item.id);
  const isSuperAdmin = /admin|super|full access/i.test(viewerRole);

  async function loadUsers() {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      setStatus(error.message);
      return;
    }
    const rows = ((data as RecordRow[]) || []).slice().sort((a, b) => {
      const aPending = String(a.status || '').toLowerCase() === 'pending' ? 0 : 1;
      const bPending = String(b.status || '').toLowerCase() === 'pending' ? 0 : 1;
      return aPending - bPending;
    });
    setUsers(rows);
  }

  useEffect(() => {
    loadUsers();
    supabase.auth.getUser().then(({ data }) => {
      const userEmail = data.user?.email;
      if (!userEmail) return;
      supabase
        .from('profiles')
        .select('role')
        .eq('email', userEmail)
        .maybeSingle()
        .then(({ data: profile }) => {
          setViewerRole(String(profile?.role || data.user?.user_metadata?.role || ''));
        });
    });
  }, []);

  function parseModules(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
      }
    }
    return [];
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    const { error } = await saveWithColumnFallback('profiles', {
      email,
      role,
      status: 'Pending',
      allowed_modules: JSON.stringify(['bookings', 'quotations_inquiries']),
      must_change_password: true,
    });
    if (error) {
      console.error(error);
      setStatus(error.message);
      return;
    }
    setStatus('Invite saved. The user stays Pending until you activate the account.');
    setEmail('');
    await loadUsers();
  }

  async function toggleModule(user: RecordRow, moduleId: string) {
    const current = parseModules(user.allowed_modules);
    const next = current.includes(moduleId)
      ? current.filter((item) => item !== moduleId)
      : [...current, moduleId];
    const { error } = await saveWithColumnFallback('profiles', { allowed_modules: JSON.stringify(next) }, user.id);
    if (error) {
      setStatus(error.message);
      return;
    }
    await loadUsers();
  }

  async function setUserStatus(user: RecordRow, nextStatus: 'Active' | 'Pending') {
    if (!user.id) return;
    const { error } = await saveWithColumnFallback('profiles', { status: nextStatus }, user.id);
    if (error) {
      setStatus(error.message);
      return;
    }
    if (nextStatus === 'Active') {
      await saveWithColumnFallback('profiles', { must_change_password: true }, user.id);
      await notifyWorkspace({
        title: 'Account approved',
        message: `Your Eton Safaris dashboard account (${String(user.email || '')}) has been approved. You can now sign in at https://etonsafaris.com/login`,
        category: 'system',
        guestEmail: String(user.email || ''),
        sendToGuest: true,
      });
    }
    setStatus(nextStatus === 'Active' ? 'User activated.' : 'User set back to pending.');
    await loadUsers();
  }

  async function deleteUser(user: RecordRow) {
    if (!isSuperAdmin) {
      setStatus('Only a Super Admin can delete users.');
      return;
    }
    if (!user.id || !confirm(`Delete ${String(user.email || 'this user')}? This cannot be undone.`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', user.id);
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus('User deleted.');
    await loadUsers();
  }

  return (
    <div>
      <h2 className="font-serif text-3xl">User Management</h2>
      <p className="mt-1 text-sm text-gray-500">
        Invite users, approve pending sign-ups, and grant module access. Restricted users see “No Access” on modules they cannot open.
      </p>
      <form onSubmit={invite} className="mt-6 rounded-xl border bg-white p-5">
        <h3 className="font-semibold">Invite New User</h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter email address"
            className="flex-1 rounded-lg border px-3 py-2"
          />
          <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-lg border px-3 py-2">
            <option>Limited Access (User)</option>
            <option>Tour Operator</option>
            <option>Content Manager</option>
            <option>Full Access (Admin)</option>
          </select>
          <button type="submit" className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white">
            Send Invite
          </button>
        </div>
        {status && <p className="mt-3 text-sm text-moss">{status}</p>}
      </form>
      <div className="mt-8 space-y-4">
        {users.map((user, index) => {
          const allowed = parseModules(user.allowed_modules);
          const isAdmin = String(user.role || '').toLowerCase().includes('admin');
          const userStatus = String(user.status || 'Active');
          const pending = userStatus.toLowerCase() === 'pending';
          return (
            <div key={String(user.id ?? index)} className="rounded-xl border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{String(user.full_name || user.email || 'User')}</p>
                  <p className="text-sm text-gray-500">{String(user.email || '')}</p>
                  <p className="text-sm text-gray-500">{String(user.role || 'Limited Access (User)')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      pending ? 'bg-amber-100 text-amber-800' : 'bg-moss/15 text-moss'
                    }`}
                  >
                    {userStatus}
                  </span>
                  {pending ? (
                    <button
                      type="button"
                      onClick={() => setUserStatus(user, 'Active')}
                      className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Activate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUserStatus(user, 'Pending')}
                      className="rounded-lg border px-3 py-1.5 text-xs"
                    >
                      Set pending
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => deleteUser(user)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {!isAdmin && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {modules.map((moduleId) => (
                    <label key={moduleId} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={allowed.includes(moduleId)}
                        onChange={() => toggleModule(user, moduleId)}
                      />
                      {moduleId.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
