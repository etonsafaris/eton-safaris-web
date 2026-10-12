'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setError('');
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; email?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not save the new password.');
      return;
    }
    setDone(true);
    window.setTimeout(() => {
      router.replace(body.email ? `/login?email=${encodeURIComponent(body.email)}` : '/login');
    }, 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex flex-col items-center text-center">
          <BrandLogo size={72} />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Choose a new password</h1>
          <p className="mt-2 text-sm text-gray-500">This link works for one hour.</p>
        </div>
        {done ? (
          <p className="text-sm text-[#00A651]">Password saved. Taking you to sign in…</p>
        ) : (
          <>
            <label className="block text-sm font-semibold text-gray-700">
              New password
              <div className="mt-1 flex items-center rounded-lg border border-gray-200 px-3">
                <Lock className="h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full px-3 py-3 text-sm outline-none"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password">
                  {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </button>
              </div>
            </label>
            <label className="mt-3 block text-sm font-semibold text-gray-700">
              Confirm password
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none"
              />
            </label>
            {!token ? (
              <p className="mt-3 text-sm text-red-600">
                This page needs the reset link from your email. Open that link again, or request a new one from the sign-in page.
              </p>
            ) : null}
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={saving || !token}
              className="mt-5 w-full rounded-lg bg-[#00A651] py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save password'}
            </button>
          </>
        )}
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="px-4 py-20 text-center text-gray-500">Loading reset link…</p>}>
      <ResetForm />
    </Suspense>
  );
}
