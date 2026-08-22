'use client';

import { useState } from 'react';
import Link from 'next/link';
import PublicShell from '@/components/public/PublicShell';
import PageHero from '@/components/public/PageHero';
import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import { supabase } from '@/lib/supabase/client';
import { agentApplicationId, saveAgentApplication } from '@/lib/agent-register';
import { notifyWorkspace } from '@/lib/notify';
import Honeypot, { isSpamHoneypot } from '@/components/public/Honeypot';
import MathCaptcha from '@/components/public/MathCaptcha';
import SearchableSelect from '@/components/admin/SearchableSelect';

export default function AgentRegisterPage() {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: 'Uganda',
    gender: '',
    company: '',
    company_website: '',
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

    let userId = '';
    if (form.password) {
      const { data: signedUp } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: form.name.trim(), role: 'Travel Agent' } },
      });
      userId = signedUp?.user?.id || '';
      await supabase.auth.signOut();
    }

    const result = await saveAgentApplication({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      country: form.country,
      gender: form.gender,
      company: form.company.trim(),
      company_website: form.company_website.trim(),
      address: form.address.trim(),
      bio: form.bio.trim(),
      password: form.password,
      user_id: userId,
      status: 'Pending',
    });

    if (result.error) {
      console.error('[Supabase] Agent registration failed:', result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }

    const agentId = agentApplicationId(result);

    const origin = window.location.origin.replace(/\/$/, '');
    const activateLink = agentId
      ? `${origin}/admin/registered_agents/activate?id=${agentId}`
      : `${origin}/admin/registered_agents`;
    const approveLink = agentId ? `${origin}/api/agents/approve?id=${agentId}` : activateLink;

    await notifyWorkspace({
      title: 'New agent registration — approval required',
      message: `${form.name} (${form.email}, ${form.phone}, ${form.country}) applied as an agent and is waiting for approval. Open Agents: ${origin}/admin/registered_agents`,
      category: 'agent',
      recordDashboard: true,
      emailAdmin: true,
    });

    await notifyWorkspace({
      title: 'Your Eton Safaris agent application is pending',
      message: `Hello ${form.name}, thank you for registering as an Eton Safaris agent. Your application is waiting for administrator approval. You will receive another email when your account is activated. Please wait before signing in to the agent portal.`,
      category: 'agent',
      guestEmail: form.email.trim(),
      sendToGuest: true,
      emailAdmin: false,
      recordDashboard: false,
    });

    setSaving(false);
    setSubmitted(true);
    setStatus('Application received. Please wait for an administrator to approve your account.');
  }

  return (
    <PublicShell>
      <PageHero
        title="Become a Registered Agent"
        subtitle="Submit your bio, address, and contact details. Access stays pending until an admin verifies your account."
      />

      <section className="mx-auto max-w-2xl px-4 py-12">
        {submitted ? (
          <div className="rounded-2xl border border-[#00A651]/20 bg-white p-8 text-center shadow-card">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#00A651]">Application received</p>
            <h2 className="mt-2 font-serif text-3xl text-[#111827]">Please wait for admin approval</h2>
            <p className="mt-4 text-sm leading-6 text-gray-600">
              Thank you, {form.name}. Your agent account is pending. An administrator will review it and activate access.
              You will get an email at {form.email} when you can sign in to the agent portal. Do not use the portal until
              that approval arrives.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-full bg-moss-accent px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-forest"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="relative space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-card md:p-8">
              <Honeypot value={honeypot} onChange={setHoneypot} />
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                <label className="block text-xs font-bold text-gray-500">
                  Full Name
                  <input
                    required
                    placeholder="Enter full name"
                    value={form.name}
                    onChange={(event) => update('name', event.target.value)}
                    className="mt-2 h-14 w-full rounded-2xl border-none bg-gray-50 px-6 text-sm outline-none focus:ring-2 focus:ring-moss/20"
                  />
                </label>
                <label className="block text-xs font-bold text-gray-500">
                  Email Address
                  <input
                    required
                    type="email"
                    placeholder="Enter email"
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                    className="mt-2 h-14 w-full rounded-2xl border-none bg-gray-50 px-6 text-sm outline-none focus:ring-2 focus:ring-moss/20"
                  />
                </label>
                <label className="block text-xs font-bold text-gray-500">
                  Phone Number
                  <input
                    required
                    placeholder="Enter phone number"
                    value={form.phone}
                    onChange={(event) => update('phone', event.target.value)}
                    className="mt-2 h-14 w-full rounded-2xl border-none bg-gray-50 px-6 text-sm outline-none focus:ring-2 focus:ring-moss/20"
                  />
                </label>
                <label className="block text-xs font-bold text-gray-500">
                  Country
                  <div className="mt-2">
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
                <label className="block text-xs font-bold text-gray-500">
                  Company Name
                  <input
                    required
                    placeholder="Enter company name"
                    value={form.company}
                    onChange={(event) => update('company', event.target.value)}
                    className="mt-2 h-14 w-full rounded-2xl border-none bg-gray-50 px-6 text-sm outline-none focus:ring-2 focus:ring-moss/20"
                  />
                </label>
                <label className="block text-xs font-bold text-gray-500">
                  Company Website
                  <input
                    placeholder="Enter website URL"
                    value={form.company_website}
                    onChange={(event) => update('company_website', event.target.value)}
                    className="mt-2 h-14 w-full rounded-2xl border-none bg-gray-50 px-6 text-sm outline-none focus:ring-2 focus:ring-moss/20"
                  />
                </label>
                <label className="block text-xs font-bold text-gray-500">
                  Gender
                  <div className="mt-2">
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
                <label className="block text-xs font-bold text-gray-500">
                  Physical address
                  <input
                    placeholder="Enter address"
                    value={form.address}
                    onChange={(event) => update('address', event.target.value)}
                    className="mt-2 h-14 w-full rounded-2xl border-none bg-gray-50 px-6 text-sm outline-none focus:ring-2 focus:ring-moss/20"
                  />
                </label>
              </div>
              <label className="block text-xs font-bold text-gray-500">
                Short bio and experience
                <textarea
                  required
                  placeholder="Tell us about your agency and the markets you serve"
                  value={form.bio}
                  onChange={(event) => update('bio', event.target.value)}
                  className="mt-2 h-32 w-full rounded-2xl border-none bg-gray-50 px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-moss/20"
                />
              </label>
              <label className="block text-xs font-bold text-gray-500">
                Password for the agent portal
                <input
                  type="password"
                  required
                  placeholder="Create a password"
                  value={form.password}
                  onChange={(event) => update('password', event.target.value)}
                  className="mt-2 h-14 w-full rounded-2xl border-none bg-gray-50 px-6 text-sm outline-none focus:ring-2 focus:ring-moss/20"
                />
              </label>
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
          </>
        )}
      </section>
    </PublicShell>
  );
}
