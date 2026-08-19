'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useAdminSession } from '@/components/admin/useAdminSession';
import { supabase } from '@/lib/supabase/client';
import { saveWithColumnFallback } from '@/lib/supabase-save';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, ready } = useAdminSession({ redirectTo: '/login?next=/admin/change-password' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false, password_changed_at: new Date().toISOString() },
    });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    if (user?.id) {
      await saveWithColumnFallback('profiles', { must_change_password: false }, user.id);
    } else if (user?.email) {
      await saveWithColumnFallback('profiles', { must_change_password: false }, { eq: { column: 'email', value: user.email } });
    }
    router.replace('/admin');
  }

  if (!ready) {
    return <p className="px-4 py-20 text-center text-gray-500">Checking session…</p>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-forest px-4 py-12">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex flex-col items-center text-center">
          <BrandLogo size={72} />
          <h1 className="mt-4 font-serif text-2xl font-bold text-gray-900">Change your password</h1>
          <p className="mt-2 text-sm text-gray-500">
            For security, you must set a new password before opening the dashboard.
          </p>
        </div>
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
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="mt-5 w-full rounded-lg bg-moss-accent py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save password and continue'}
        </button>
      </form>
    </div>
  );
}
