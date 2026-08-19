'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PublicShell from '@/components/public/PublicShell';
import PageHero from '@/components/public/PageHero';
import { NAV_COUNTRIES, OTHER_DESTINATIONS, SITE } from '@/lib/collections';
import { supabase } from '@/lib/supabase/client';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { notifyWorkspace } from '@/lib/notify';
import Honeypot, { isSpamHoneypot } from '@/components/public/Honeypot';
import MathCaptcha from '@/components/public/MathCaptcha';
import SearchableSelect from '@/components/admin/SearchableSelect';

export default function AgentRegisterPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: 'Uganda',
    gender: '',
    company: '',
    address: '',
    bio: '',
    password: '',
  });
  const [honeypot, setHoneypot] = useState('');
  const [captchaOk, setCaptchaOk] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isSpamHoneypot(honeypot)) return;
    if (!captchaOk) {
      setError('Complete the security check before submitting.');
      return;
    }
    setSaving(true);
    setError('');
    setStatus('');

    const payload = buildSavePayload('registered_agents', {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      country: form.country,
      gender: form.gender,
    });

    const result = await saveWithColumnFallback('registered_agents', {
      ...payload,
      status: 'Pending',
      company: form.company.trim() || null,
      address: form.address.trim() || null,
      bio: form.bio.trim() || null,
    });

    let agentId = result.data?.[0]?.id;
    if (result.error) {
      const fallback = await saveWithColumnFallback('registered_agents', payload);
      if (fallback.error) {
        console.error('[Supabase] Agent registration failed:', fallback.error);
        setError(fallback.error.message);
        setSaving(false);
        return;
      }
      agentId = fallback.data?.[0]?.id;
    }

    if (form.password) {
      await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: form.name.trim(), role: 'Agent' } },
      });
      await supabase.auth.signOut();
    }

    const origin = SITE.url.replace(/\/$/, '');
    const approveLink = agentId ? `${origin}/api/agents/approve?id=${agentId}` : `${origin}/admin/registered_agents`;
    await notifyWorkspace({
      title: 'New agent registration — approval required',
      message: `${form.name} (${form.email}, ${form.phone}, ${form.country}, ${form.gender || 'unspecified'}) applied as an agent. Click this approval link to confirm membership: ${approveLink}`,
      category: 'system',
    });

    setSaving(false);
    router.replace('/login?next=/agents/portal');
  }

  return (
    <PublicShell>
      <PageHero
        title="Become a Registered Agent"
        subtitle="Submit your bio, address, and contact details. Access stays pending until an admin verifies your account."
      />

      <section className="mx-auto max-w-2xl px-4 py-12">
        <form onSubmit={submit} className="relative space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
          <Honeypot value={honeypot} onChange={setHoneypot} />
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-moss"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-moss"
          />
          <input
            required
            placeholder="Phone (+256...)"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-moss"
          />
          <label className="block text-sm font-medium text-gray-700">
            Country
            <div className="mt-1">
              <SearchableSelect
                value={form.country}
                onChange={(value) => update('country', value)}
                options={[...NAV_COUNTRIES, ...OTHER_DESTINATIONS].map((country) => ({
                  value: country.name,
                  label: country.name,
                }))}
                placeholder="Select country"
              />
            </div>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Gender
            <div className="mt-1">
              <SearchableSelect
                value={form.gender}
                onChange={(value) => update('gender', value)}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
                placeholder="Select gender"
              />
            </div>
          </label>
          <input
            placeholder="Company / agency name"
            value={form.company}
            onChange={(event) => update('company', event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-moss"
          />
          <input
            placeholder="Physical address"
            value={form.address}
            onChange={(event) => update('address', event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-moss"
          />
          <textarea
            required
            placeholder="Short bio and experience"
            value={form.bio}
            onChange={(event) => update('bio', event.target.value)}
            className="h-32 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-moss"
          />
          <input
            type="password"
            required
            placeholder="Create a password for the agent portal"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-moss"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {status && <p className="text-sm text-moss">{status}</p>}
          <MathCaptcha onValidChange={setCaptchaOk} />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-moss-accent py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-forest disabled:opacity-60"
          >
            {saving ? 'Submitting…' : 'Submit agent application'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          Already verified?{' '}
          <Link href="/login?next=/agents/portal" className="font-semibold text-moss">
            Sign in
          </Link>
        </p>
      </section>
    </PublicShell>
  );
}
