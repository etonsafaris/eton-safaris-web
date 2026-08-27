'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAdminSessionCookieServer, syncAdminSessionCookie } from '@/lib/admin-session-sync';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

type UseAdminSessionOptions = {
  redirectTo?: string;
};

function needsPasswordChange(user: User, profileFlag?: boolean | null) {
  if (user.user_metadata?.must_change_password === false) return false;
  if (profileFlag === true) return true;
  return Boolean(user.user_metadata?.must_change_password);
}

export function useAdminSession({ redirectTo = '/login?next=/admin' }: UseAdminSessionOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function enforcePasswordChange(nextUser: User) {
      if (pathname === '/admin/change-password') return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('email', nextUser.email || '')
        .maybeSingle();
      const flag =
        profile && 'must_change_password' in profile
          ? Boolean((profile as { must_change_password?: boolean }).must_change_password)
          : undefined;
      if (needsPasswordChange(nextUser, flag)) {
        router.replace('/admin/change-password');
      }
    }

    async function init() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error || !data.session) {
          if (error) {
            console.error('[Auth] Admin session error:', error.message);
          }
          router.replace(redirectTo);
          return;
        }

        setUser(data.session.user);
        await syncAdminSessionCookie();
        await enforcePasswordChange(data.session.user);
      } catch (error) {
        console.error('[Auth] Failed to read admin session:', error);
        if (mounted) router.replace(redirectTo);
      } finally {
        if (mounted) setReady(true);
      }
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      void (async () => {
        if (!session) {
          setUser(null);
          await clearAdminSessionCookieServer();
          router.replace(redirectTo);
          return;
        }
        setUser(session.user);
        await syncAdminSessionCookie();
        await enforcePasswordChange(session.user);
      })();
    });

    const IDLE_MS = 30 * 60 * 1000;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    function resetIdle() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(async () => {
        await clearAdminSessionCookieServer();
        await supabase.auth.signOut();
        router.replace('/login');
      }, IDLE_MS);
    }

    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((event) => window.addEventListener(event, resetIdle));
    resetIdle();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach((event) => window.removeEventListener(event, resetIdle));
    };
  }, [pathname, redirectTo, router]);

  return { user, ready };
}
