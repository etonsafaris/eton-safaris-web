'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { SITE } from '@/lib/collections';

const inputClass =
  'w-full h-10 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]';
const passwordInputClass =
  'w-full h-10 pl-9 pr-9 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]';
const labelClass = 'block text-xs font-medium text-gray-700';
const iconWrap = 'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5';

export default function CompleteInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = String(params?.token || '').trim();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('User');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token) {
        setError('This invite link is missing a token.');
        setLoading(false);
        return;
      }
      const response = await fetch(`/api/public/staff-invite?token=${encodeURIComponent(token)}`);
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        invite?: { email?: string; name?: string; role?: string };
      };
      if (!response.ok || !body.invite) {
        setError(body.error || 'This invite link is invalid or has expired.');
        setLoading(false);
        return;
      }
      setEmail(body.invite.email || '');
      setRole(body.invite.role || 'User');
      setName(body.invite.name || '');
      setLoading(false);
    }
    void load();
  }, [token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setError('');
    const response = await fetch('/api/public/staff-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name, password }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not complete your account.');
      return;
    }
    setDone(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4 py-10">
      <div className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-6 pb-2 pt-4 text-center">
          <div className="mb-2 flex justify-center">
            <BrandLogo size={56} />
          </div>
          <h1 className="text-[22px] font-bold text-gray-900">Complete your account</h1>
          <p className="text-[13px] text-gray-500">
            {loading ? 'Loading your invite…' : `Join ${SITE.name} as a ${role}`}
          </p>
        </div>
        <div className="px-6 pb-6">
          {done ? (
            <div className="space-y-3 text-sm text-gray-600">
              <p>Your {role} account is ready. Sign in with {email} and the password you just set.</p>
              <p>If the dashboard still says pending, wait for an administrator to activate access.</p>
              <button
                type="button"
                onClick={() => router.replace(`/login?email=${encodeURIComponent(email)}`)}
                className="w-full rounded-lg bg-[#00A651] py-2.5 text-sm font-semibold text-white"
              >
                Continue to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-2.5">
              <div className="space-y-1.5">
                <label className={labelClass}>Full name</label>
                <div className="relative">
                  <div className={iconWrap}>
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Email</label>
                <div className="relative">
                  <div className={iconWrap}>
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input readOnly value={email} className={inputClass} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <div className={iconWrap}>
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    required
                    minLength={6}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={passwordInputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Confirm password</label>
                <div className="relative">
                  <div className={iconWrap}>
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    required
                    minLength={6}
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={passwordInputClass}
                  />
                </div>
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={saving || loading || !email}
                className="w-full rounded-lg bg-[#00A651] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Complete signup'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
