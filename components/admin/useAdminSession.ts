'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAdminSessionCookieServer, syncAdminSessionCookie } from '@/lib/admin-session-sync';
import { supabase } from '@/lib/supabase/client';
import { decodeJwtPayload, emailFromJwtPayload, readStoredAccessToken } from '@/lib/supabase/jwt-payload';

type User = {
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type UseAdminSessionOptions = {
  redirectTo?: string;
};

function needsPasswordChange(user: User) {
  if (user.user_metadata?.must_change_password === false) return false;
  return Boolean(user.user_metadata?.must_change_password);
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        window.clearTimeout(timer);
        resolve(fallback);
      });
  });
}

function userFromToken(token: string): User | null {
  const payload = decodeJwtPayload(token);
  const email = emailFromJwtPayload(payload);
  if (!email) return null;
  const metadata =
    payload?.user_metadata && typeof payload.user_metadata === 'object'
      ? (payload.user_metadata as Record<string, unknown>)
      : {};
  return {
    email,
    user_metadata: metadata,
  };
}

export function useAdminSession({ redirectTo = '/login?next=/admin' }: UseAdminSessionOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    function goToPasswordChange(nextUser: User) {
      if (pathname === '/admin/change-password') return;
      if (needsPasswordChange(nextUser)) {
        router.replace('/admin/change-password');
      }
    }

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        const session = data.session;
        const token = session?.access_token || readStoredAccessToken();
        const nextUser = session?.user
          ? {
              email: session.user.email,
              user_metadata: session.user.user_metadata || {},
            }
          : token
            ? userFromToken(token)
            : null;

        if (nextUser?.email) {
          setUser(nextUser);
          setReady(true);
          goToPasswordChange(nextUser);
          if (token) void withTimeout(syncAdminSessionCookie(token), 2500, false);
          return;
        }

        if (pathname.startsWith('/admin')) {
          setReady(true);
          return;
        }
        router.replace(redirectTo);
      } catch (error) {
        console.error('[Auth] Failed to read admin session:', error);
        if (mounted && !pathname.startsWith('/admin')) router.replace(redirectTo);
      } finally {
        if (mounted) setReady(true);
      }
    }

    void init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      void (async () => {
        if (!session) {
          const token = readStoredAccessToken();
          const restored = token ? userFromToken(token) : null;
          if (restored?.email) {
            setUser(restored);
            void withTimeout(syncAdminSessionCookie(token), 2500, false);
            return;
          }
          setUser(null);
          if (!pathname.startsWith('/admin')) {
            await withTimeout(clearAdminSessionCookieServer().then(() => true), 2000, true);
            router.replace(redirectTo);
          }
          return;
        }
        setUser({
          email: session.user.email,
          user_metadata: session.user.user_metadata || {},
        });
        goToPasswordChange(session.user);
        void withTimeout(syncAdminSessionCookie(session.access_token), 2500, false);
      })();
    });

    const IDLE_MS = 30 * 60 * 1000;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    function resetIdle() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(async () => {
        await withTimeout(clearAdminSessionCookieServer().then(() => true), 2000, true);
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
