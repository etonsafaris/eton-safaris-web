'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { SITE } from '@/lib/collections';
import { syncAdminSessionCookie } from '@/lib/admin-session-sync';
import { supabase } from '@/lib/supabase/client';
import { findPublicAgentByEmail, saveAgentApplication } from '@/lib/agent-register';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { notifyWorkspace } from '@/lib/notify';

const PRIMARY = '#00A651';
const PRIMARY_DARK = '#008f47';

const ROLES = [
  { label: 'Admin', value: 'Full Access (Admin)' },
  { label: 'Content Manager', value: 'Content Manager' },
  { label: 'Tour Operator', value: 'Tour Operator' },
  { label: 'Travel Agent', value: 'Travel Agent' },
] as const;

const inputClass =
  'w-full h-10 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]';
const passwordInputClass =
  'w-full h-10 pl-9 pr-9 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]';
const labelClass = 'block text-xs font-medium text-gray-700';
const iconWrap = 'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5';
const primaryBtn =
  'mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0';
const outlineBtn =
  'flex h-10 w-full items-center justify-center rounded-lg border-2 border-[#00A651] text-sm font-semibold text-[#059669] transition-all duration-200 hover:bg-emerald-50';

function PlusGrid() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-[#12b86a] via-[#00A651] to-[#047857]" />
      <div className="absolute left-0 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#34d399]/30 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-400/30 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-2xl" />
      <div className="login-plus-pattern absolute inset-0 opacity-[0.03]" />
    </>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams?.get('next') || '/admin';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('Full Access (Admin)');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const isSignup = mode === 'signup';
  const fullName = `${firstName} ${lastName}`.trim();

  useEffect(() => {
    document.documentElement.classList.add('login-screen');
    document.body.classList.add('login-screen');
    document.documentElement.classList.toggle('login-locked', !isSignup);
    document.body.classList.toggle('login-locked', !isSignup);
    return () => {
      document.documentElement.classList.remove('login-screen', 'login-locked');
      document.body.classList.remove('login-screen', 'login-locked');
    };
  }, [isSignup]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted || !data.session) return;
      const synced = await syncAdminSessionCookie();
      if (synced) router.replace(nextPath.startsWith('/admin') ? nextPath : '/admin');
    });
    return () => {
      mounted = false;
    };
  }, [nextPath, router]);

  async function sendReset() {
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/change-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSent(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (isSignup && isAgentRole(role)) {
      router.push('/agents/register');
      setLoading(false);
      return;
    }

    const authResult = isSignup
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role } },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (authResult.error) {
      setError(authResult.error.message);
      setLoading(false);
      return;
    }

    if (isSignup && authResult.data.user) {
      const isTravelAgent = /travel agent/i.test(role);
      await saveWithColumnFallback(
        'profiles',
        {
          id: authResult.data.user.id,
          email,
          full_name: fullName,
          role,
          status: 'Pending',
        },
        { keepId: true }
      );

      if (isTravelAgent) {
        const agentInsert = await saveAgentApplication({
          name: fullName,
          username: fullName,
          email,
          password,
          isActive: false,
          status: 'Pending',
        });
        const origin = window.location.origin;
        const approveLink = agentInsert.data?.[0]?.id
          ? `${origin}/api/agents/approve?id=${agentInsert.data[0].id}`
          : `${origin}/admin/registered_agents`;
        await notifyWorkspace({
          title: 'New agent registration — approval required',
          message: `${fullName} (${email}) registered as a Travel Agent from Create Account. Approval: ${approveLink}`,
          category: 'agent',
          guestEmail: email,
        });
      } else {
        await notifyWorkspace({
          title: 'New account request',
          message: `${fullName} (${email}) requested ${role} access and is waiting for admin approval.`,
          category: 'system',
          guestEmail: email,
        });
      }

      await supabase.auth.signOut();
      setLoading(false);
      setMode('signin');
      setResetSent(false);
      setError('');
      window.alert(
        isTravelAgent
          ? 'Travel agent account created. An administrator must approve it before you can sign in.'
          : 'Account created. An administrator must approve it before you can sign in.'
      );
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('status,role,must_change_password')
      .eq('email', email)
      .maybeSingle();
    const profileRow = profileError
      ? (await supabase.from('profiles').select('status,role').eq('email', email).maybeSingle()).data
      : profile;
    const profileStatus = String(profileRow?.status || '').toLowerCase();
    if (profileStatus === 'pending' || profileStatus === 'inactive') {
      await supabase.auth.signOut();
      setError(
        profileStatus === 'pending'
          ? 'Your account is waiting for administrator approval.'
          : 'Your account is inactive. Contact an administrator.'
      );
      setLoading(false);
      return;
    }

    const agentRow = await findPublicAgentByEmail(email);
    const isAgent = Boolean(agentRow);
    const agentStatus = String(agentRow?.status || '').toLowerCase();
    const roleValue = String(profileRow?.role || authResult.data.user?.user_metadata?.role || '');
    const isStaff =
      /admin|full access|tour operator|content manager/i.test(roleValue) && !/travel agent/i.test(roleValue);

    if (isAgent && !isStaff && agentStatus !== 'active') {
      await supabase.auth.signOut();
      setError(
        'Your agent application is waiting for administrator approval. You will be notified by email when it is activated.'
      );
      setLoading(false);
      return;
    }
    const mustChange =
      Boolean(authResult.data.user?.user_metadata?.must_change_password) ||
      Boolean((profileRow as { must_change_password?: boolean } | null)?.must_change_password);

    let destination = '/admin';
    if (mustChange && isStaff) destination = '/admin/change-password';
    else if (isAgent && !isStaff) destination = '/agents/portal';
    else if (nextPath.startsWith('/agents')) destination = nextPath;
    else if (nextPath.startsWith('/admin') && isStaff) destination = nextPath;
    else if (isStaff) destination = '/admin';
    else if (isAgent) destination = '/agents/portal';

    await syncAdminSessionCookie();
    router.refresh();
    router.replace(destination);
  }

  function isAgentRole(value: string) {
    return /travel agent/i.test(value);
  }

  function onRoleChange(value: string) {
    if (isAgentRole(value)) {
      router.push('/agents/register');
      return;
    }
    setRole(value);
  }

  function toggleMode() {
    setMode((current) => (current === 'signin' ? 'signup' : 'signin'));
    setError('');
    setResetSent(false);
  }

  return (
    <div
      className={
        isSignup
          ? 'relative min-h-dvh w-full overflow-y-auto font-ui'
          : 'relative flex h-dvh max-h-dvh w-full items-center justify-center overflow-hidden font-ui'
      }
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <PlusGrid />
      </div>

      <div
        className={
          isSignup
            ? 'relative z-10 mx-auto w-full max-w-[360px] animate-fade-in-up px-4 py-8'
            : 'relative z-10 w-full max-w-[360px] animate-fade-in-up px-4'
        }
      >
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="px-6 pb-2 pt-4 text-center">
            <div className="mb-2 flex justify-center">
              <BrandLogo size={56} />
            </div>
            <h1 className="mb-0.5 text-[22px] font-bold leading-tight text-gray-900">
              {isSignup ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-[13px] text-gray-500">
              {isSignup ? `Join ${SITE.name} and start your journey` : 'Sign in to your account to continue'}
            </p>
          </div>

          <div className="px-6 pb-4">
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {isSignup ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelClass} htmlFor="fname">
                      First Name
                    </label>
                    <div className="relative">
                      <div className={iconWrap}>
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        id="fname"
                        required
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        className={inputClass}
                        placeholder="John"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass} htmlFor="lname">
                      Last Name
                    </label>
                    <div className="relative">
                      <div className={iconWrap}>
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        id="lname"
                        required
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        className={inputClass}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <div className={iconWrap}>
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {isSignup ? (
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="role">
                    Role
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(event) => onRoleChange(event.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 transition-all duration-200 focus:border-[#00A651] focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                  >
                    {ROLES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={labelClass} htmlFor="password">
                    Password
                  </label>
                  {mode === 'signin' ? (
                    <button
                      type="button"
                      onClick={() => void sendReset()}
                      className="text-xs font-medium text-[#00A651] hover:underline"
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </div>
                <div className="relative">
                  <div className={iconWrap}>
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={passwordInputClass}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label="Toggle password visibility"
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isSignup ? (
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className={iconWrap}>
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className={passwordInputClass}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((value) => !value)}
                      aria-label="Toggle confirm password visibility"
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ) : null}

              {resetSent ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-[#00A651]">
                  Password reset email sent. Check your inbox.
                </p>
              ) : null}
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className={primaryBtn}
                style={{ background: `linear-gradient(to right, ${PRIMARY}, ${PRIMARY_DARK})` }}
              >
                {loading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In'}
              </button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-500">
                    {isSignup ? 'Already have an account?' : `New to ${SITE.name}?`}
                  </span>
                </div>
              </div>

              <button type="button" onClick={toggleMode} className={outlineBtn}>
                {isSignup ? 'Sign In' : 'Create an Account'}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-3 text-center text-[13px] text-white/70">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden px-4 font-ui">
          <PlusGrid />
          <div className="relative h-[420px] w-full max-w-[340px] animate-pulse rounded-2xl bg-white/90 shadow-2xl" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
