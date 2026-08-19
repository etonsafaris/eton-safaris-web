'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  X,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useAdminSession } from '@/components/admin/useAdminSession';
import { MAIN_COLLECTIONS, SYSTEM_COLLECTIONS } from '@/lib/collections';
import { canAccessModule, collectionIdFromPath, parseModules } from '@/lib/admin-access';
import { collectionIcon } from '@/lib/admin-icons';
import { clearAdminSessionCookieServer } from '@/lib/admin-session-sync';
import { supabase } from '@/lib/supabase/client';

function NavLink({
  href,
  label,
  iconName,
  active,
  collapsed,
  onNavigate,
  onGuard,
}: {
  href: string;
  label: string;
  iconName?: string;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
  onGuard: (event: React.MouseEvent, id: string) => void;
}) {
  const id = href.replace('/admin/', '').replace('/admin', 'overview') || 'overview';
  const Icon = collectionIcon(iconName);
  return (
    <Link
      href={href}
      title={label}
      onClick={(event) => {
        onGuard(event, id);
        onNavigate?.();
      }}
      className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition ${
        collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''
      } ${
        active
          ? 'bg-[#00A651] text-white shadow-sm'
          : 'text-[#4b5563] hover:bg-[#ecfdf3] hover:text-[#111827] dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-[#6b7280] dark:text-gray-400'}`} />
      <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
    </Link>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, ready } = useAdminSession();
  const [dark, setDark] = useState(false);
  const [role, setRole] = useState('');
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [accessAlert, setAccessAlert] = useState('');
  const [noticeCount, setNoticeCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [headerQuery, setHeaderQuery] = useState('');
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('admin-theme');
    if (stored === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
    if (localStorage.getItem('admin-sidebar-collapsed') === '1') {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from('profiles')
      .select('role,allowed_modules')
      .eq('email', user.email)
      .maybeSingle()
      .then(({ data }) => {
        const nextRole = String(data?.role || user.user_metadata?.role || '');
        setRole(nextRole);
        setAllowedModules(parseModules(data?.allowed_modules));
        setAccessReady(true);
        const isStaff = /admin|full access|tour operator|content manager/i.test(nextRole);
        if (isStaff) return;
        void supabase
          .from('registered_agents')
          .select('id')
          .eq('email', user.email)
          .then(({ data: agents }) => {
            if ((agents || []).length > 0) router.replace('/agents/portal');
          });
      });

    Promise.all([
      supabase.from('notifications').select('id', { count: 'exact', head: true }),
      supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
    ]).then(([notes, inquiries, bookings]) => {
      setNoticeCount((notes.count || 0) + (inquiries.count || 0) + (bookings.count || 0));
    });
  }, [user]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('admin-sidebar-collapsed', next ? '1' : '0');
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('admin-theme', next ? 'dark' : 'light');
  }

  function canAccess(id: string) {
    return canAccessModule(id, role || String(user?.user_metadata?.role || ''), allowedModules);
  }

  useEffect(() => {
    if (!accessReady) return;
    const id = collectionIdFromPath(pathname || '');
    if (canAccess(id)) return;
    setAccessAlert('No Access');
    window.setTimeout(() => setAccessAlert(''), 2500);
    router.replace('/admin');
  }, [pathname, accessReady, role, allowedModules, router]);

  useEffect(() => {
    setAdminMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!adminMenuRef.current?.contains(event.target as Node)) {
        setAdminMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  function guard(event: React.MouseEvent, id: string) {
    if (canAccess(id)) return;
    event.preventDefault();
    setAccessAlert('No Access');
    window.setTimeout(() => setAccessAlert(''), 2500);
  }

  async function signOut() {
    await clearAdminSessionCookieServer();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#f3f4f6] font-ui dark:bg-[#0a0c10]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00A651] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = user.email?.split('@')[0]?.replace(/\./g, ' ') || 'Admin';
  const initial = displayName.charAt(0).toUpperCase();
  const currentCollection =
    MAIN_COLLECTIONS.find((item) => {
      const href = item.id === 'overview' ? '/admin' : `/admin/${item.id}`;
      return pathname === href || (item.id !== 'overview' && pathname?.startsWith(`${href}/`));
    }) ||
    SYSTEM_COLLECTIONS.find((item) => pathname?.startsWith(`/admin/${item.id}`));
  const searchHits = headerQuery.trim()
    ? [...MAIN_COLLECTIONS, ...SYSTEM_COLLECTIONS].filter((item) => {
        const needle = headerQuery.trim().toLowerCase();
        return item.label.toLowerCase().includes(needle) || item.id.replace(/_/g, ' ').includes(needle);
      }).slice(0, 8)
    : [];

  function goToCollection(id: string) {
    const href = id === 'overview' ? '/admin' : `/admin/${id}`;
    setHeaderQuery('');
    router.push(href);
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f3f4f6] font-ui text-[#111827] dark:bg-[#0a0c10] dark:text-white">
      {accessAlert && (
        <div className="fixed right-6 top-6 z-50 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {accessAlert}
        </div>
      )}
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh flex-col border-r border-[#e5e7eb] bg-white transition-all duration-200 dark:border-white/10 dark:bg-[#111318] lg:static lg:translate-x-0 ${
          collapsed ? 'lg:w-[76px]' : 'lg:w-[256px]'
        } w-[256px] ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className={`flex shrink-0 items-center border-b border-[#e5e7eb] py-3 dark:border-white/10 ${collapsed ? 'justify-between px-3 lg:justify-center lg:px-2' : 'justify-between px-4'}`}>
          {collapsed ? (
            <>
              <Link href="/admin" className="lg:hidden" onClick={() => setMenuOpen(false)}>
                <BrandLogo size={64} light={dark} compact admin />
              </Link>
              <Link href="/admin" className="hidden lg:flex" title="Eton Safaris">
                <BrandLogo size={48} light={dark} />
              </Link>
            </>
          ) : (
            <Link href="/admin" onClick={() => setMenuOpen(false)}>
              <BrandLogo size={64} light={dark} compact admin />
            </Link>
          )}
          <button type="button" onClick={() => setMenuOpen(false)} className="rounded p-1 hover:bg-[#f0fdf4] dark:hover:bg-white/5 lg:hidden" aria-label="Close sidebar">
            <X className="h-4 w-4 text-[#6b7280] dark:text-gray-400" />
          </button>
        </div>

        <nav className={`min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-4 ${collapsed ? 'lg:px-2' : ''}`}>
          {MAIN_COLLECTIONS.map((item) => {
            const href = item.id === 'overview' ? '/admin' : `/admin/${item.id}`;
            const active = pathname === href || (item.id !== 'overview' && pathname?.startsWith(`${href}/`));
            return (
              <NavLink
                key={item.id}
                href={href}
                label={item.label}
                iconName={item.icon}
                active={Boolean(active)}
                collapsed={collapsed}
                onNavigate={() => setMenuOpen(false)}
                onGuard={guard}
              />
            );
          })}
        </nav>

        <div className={`shrink-0 border-t border-[#e5e7eb] px-3 py-3 dark:border-white/10 ${collapsed ? 'lg:px-2' : ''}`}>
          <div className={`flex items-center gap-3 rounded-xl bg-[#f8fafc] px-3 py-3 dark:bg-[#161b22] ${collapsed ? 'lg:justify-center lg:p-2' : ''}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00A651] text-sm font-bold text-white">
              {initial}
            </div>
            <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-sm font-semibold capitalize text-[#111827] dark:text-white">{displayName}</p>
              <p className="truncate text-xs text-[#6b7280] dark:text-gray-400">Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Log Out"
            className={`mt-2 flex w-full items-center gap-2 rounded-full border border-red-500/40 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 ${
              collapsed ? 'lg:justify-center lg:gap-0 lg:p-2' : ''
            }`}
          >
            <LogOut className="h-4 w-4" />
            <span className={collapsed ? 'lg:hidden' : ''}>Log Out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#e5e7eb] bg-white px-4 dark:border-white/10 dark:bg-[#111318] sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f3f4f6] dark:text-gray-300 dark:hover:bg-white/5 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/admin" className="shrink-0 lg:hidden">
              <BrandLogo size={44} light={dark} />
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden rounded-lg p-2 text-[#6b7280] hover:bg-[#f3f4f6] dark:text-gray-300 dark:hover:bg-white/5 lg:inline-flex"
              aria-label={collapsed ? 'Expand dashboard' : 'Collapse dashboard'}
            >
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            {currentCollection ? (
              <h1 className="hidden truncate text-sm font-semibold text-[#111827] dark:text-white sm:block">
                {currentCollection.label}
              </h1>
            ) : null}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const first = searchHits[0];
                if (first) goToCollection(first.id);
              }}
              className="relative hidden max-w-md flex-1 md:block"
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={headerQuery}
                onChange={(event) => setHeaderQuery(event.target.value)}
                placeholder="Search modules..."
                className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#00A651] dark:border-white/10 dark:bg-[#161b22] dark:text-white"
              />
              {searchHits.length > 0 ? (
                <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-[#e5e7eb] bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[#161b22]">
                  {searchHits.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goToCollection(item.id)}
                      className="flex w-full items-center px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#ecfdf3] dark:text-white dark:hover:bg-white/5"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </form>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleDark} className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f3f4f6] dark:text-gray-300 dark:hover:bg-white/5" aria-label="Toggle dark mode">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link href="/admin/notifications" className="relative rounded-lg p-2 text-[#6b7280] hover:bg-[#f3f4f6] dark:text-gray-300 dark:hover:bg-white/5" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {noticeCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
            <div className="relative" ref={adminMenuRef}>
              <button
                type="button"
                onClick={() => setAdminMenuOpen((open) => !open)}
                className="ml-1 flex items-center gap-2 rounded-full bg-[#00A651] py-1 pl-1 pr-3 text-white shadow-sm hover:bg-[#009247]"
                aria-expanded={adminMenuOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
                  {initial}
                </span>
                <span className="hidden text-sm font-semibold sm:inline">Admin</span>
                <ChevronDown className={`h-4 w-4 transition ${adminMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {adminMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white py-2 shadow-lg dark:border-white/10 dark:bg-[#161b22]"
                >
                  <p className="px-4 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
                    System
                  </p>
                  <div className="space-y-0.5 px-1">
                    {SYSTEM_COLLECTIONS.map((item) => {
                      const href = `/admin/${item.id}`;
                      const active = pathname === href || pathname?.startsWith(`${href}/`);
                      return (
                        <NavLink
                          key={item.id}
                          href={href}
                          label={item.label}
                          iconName={item.icon}
                          active={Boolean(active)}
                          onNavigate={() => setAdminMenuOpen(false)}
                          onGuard={guard}
                        />
                      );
                    })}
                    <Link
                      href="/"
                      target="_blank"
                      role="menuitem"
                      className="flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium text-[#4b5563] hover:bg-[#f0fdf4] hover:text-[#111827] dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
                      onClick={() => setAdminMenuOpen(false)}
                    >
                      <ExternalLink className="h-4 w-4 shrink-0 text-[#6b7280] dark:text-gray-400" />
                      Back to Website
                    </Link>
                  </div>
                  <div className="mx-3 my-2 border-t border-[#e5e7eb] dark:border-white/10" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      void signOut();
                    }}
                    className="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
