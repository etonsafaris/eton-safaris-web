'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminAuthHeaders } from '@/lib/admin-records-client';
import { supabase } from '@/lib/supabase/client';
import type { RecordRow } from '@/lib/types';

function ActivateAgentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams?.get('id')?.trim() || '';
  const [agent, setAgent] = useState<RecordRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    async function loadAgent() {
      for (const table of ['registered_agents', 'Agent'] as const) {
        const { data, error: loadError } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
        if (!loadError && data) {
          setAgent(data as RecordRow);
          setLoading(false);
          return;
        }
        if (loadError && !/could not find the table|schema cache/i.test(loadError.message)) {
          setError(loadError.message);
        }
      }
      setLoading(false);
    }
    void loadAgent();
  }, [id]);

  async function activate() {
    if (!agent) return;
    const agentId = id || String(agent.id || '');
    const email = String(agent.email || '');
    if (!agentId && !email.includes('@')) {
      setError('This agent has no id or email, so it cannot be activated.');
      return;
    }
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/agents/status', {
      method: 'POST',
      credentials: 'include',
      headers: await adminAuthHeaders(),
      body: JSON.stringify({
        id: agentId || undefined,
        status: 'Active',
        email,
        name: String(agent.name || agent.full_name || ''),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not activate this agent.');
      return;
    }
    setDone(true);
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading agent application…</p>;
  }

  if (!id || !agent) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="font-serif text-2xl">Agent not found</h1>
        <p className="mt-2 text-sm text-gray-500">Open the agent from the Registered Agents module instead.</p>
        <Link href="/admin/registered_agents" className="mt-4 inline-block text-sm font-semibold text-[#00A651]">
          Go to Agents module
        </Link>
      </div>
    );
  }

  const alreadyActive = String(agent.status || '').toLowerCase() === 'active';

  return (
    <div className="max-w-xl rounded-2xl border bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#00A651]">Agent approval</p>
      <h1 className="mt-1 font-serif text-3xl text-[#111827]">{String(agent.name || 'Agent')}</h1>
      <p className="mt-2 text-sm text-gray-500">Review this application, then click Activate to grant portal access.</p>
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between gap-4 border-b border-gray-100 py-2">
          <dt className="text-gray-500">Email</dt>
          <dd className="font-medium">{String(agent.email || '—')}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-gray-100 py-2">
          <dt className="text-gray-500">Phone</dt>
          <dd className="font-medium">{String(agent.phone || '—')}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-gray-100 py-2">
          <dt className="text-gray-500">Country</dt>
          <dd className="font-medium">{String(agent.country || '—')}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-gray-100 py-2">
          <dt className="text-gray-500">Company</dt>
          <dd className="font-medium">{String(agent.company || '—')}</dd>
        </div>
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-gray-500">Status</dt>
          <dd className="font-semibold text-[#00A651]">{done ? 'Active' : String(agent.status || 'Pending')}</dd>
        </div>
      </dl>
      {agent.bio ? <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{String(agent.bio)}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {done || alreadyActive ? (
        <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-[#00A651]">
          This agent is active. They can sign in to the agent portal.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void activate()}
          disabled={saving}
          className="mt-6 w-full rounded-lg bg-[#00A651] py-3 text-sm font-semibold text-white hover:bg-[#008f47] disabled:opacity-60"
        >
          {saving ? 'Activating…' : 'Activate agent'}
        </button>
      )}
      <div className="mt-4 flex gap-4 text-sm">
        <button type="button" onClick={() => router.push('/admin/registered_agents')} className="text-[#00A651]">
          Open Agents module
        </button>
      </div>
    </div>
  );
}

export default function ActivateAgentPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
      <ActivateAgentForm />
    </Suspense>
  );
}
