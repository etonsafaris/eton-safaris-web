'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Shield,
  Sun,
  User,
  X,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import AdminFavicon from '@/components/admin/AdminFavicon';
import AdminLogoLoader from '@/components/admin/AdminLogoLoader';
import NotificationBell from '@/components/admin/NotificationBell';
import { useAdminSession } from '@/components/admin/useAdminSession';
import { useAdminNotifications } from '@/components/admin/useAdminNotifications';
import { MAIN_COLLECTIONS, SYSTEM_COLLECTIONS } from '@/lib/collections';
import { canAccessModule, collectionIdFromPath, isOwnerAdminEmail, parseModules } from '@/lib/admin-access';
import { collectionIcon } from '@/lib/admin-icons';
import { useAdminTheme } from '@/components/admin/AdminThemeProvider';
import { clearAdminSessionCookieServer } from '@/lib/admin-session-sync';
import { supabase } from '@/lib/supabase/client';

function accountInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function NavLink({
  href,
  label,
  iconName,
  active,
  collapsed,
  badge,
  onNavigate,
  onGuard,
}: {
  href: string;
  label: string;
  iconName?: string;
  active: boolean;
  collapsed?: boolean;
  badge?: number;
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
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out ${
        collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''
      } ${
        active
          ? 'bg-gradient-to-r from-[#00A651] to-[#009247] text-white shadow-lg shadow-emerald-500/25'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
      }`}
    >
      <span className="relative shrink-0">
        <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
        {badge && collapsed ? (
          <span className={`absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${
            active ? 'bg-white text-[#00A651]' : 'bg-red-500 text-white'
          }`}>
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>
      <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
      {badge && !collapsed ? (
        <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
          active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
        }`}>
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, ready } = useAdminSession();
  const { unread: unreadNotifications } = useAdminNotifications();
  const { actualTheme, toggleTheme } = useAdminTheme();
  const dark = actualTheme === 'dark';
  const [role, setRole] = useState('');
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [accessAlert, setAccessAlert] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [headerQuery, setHeaderQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('admin-sidebar-collapsed') === '1') {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    const email = user?.email;
    if (!user || !email) return;
    if (isOwnerAdminEmail(email)) {
      setRole('Admin');
      setAllowedModules([]);
      setAccessReady(true);
      return;
    }
    const fallbackRole = String(user.user_metadata?.role || '');
    const accessTimer = window.setTimeout(() => setAccessReady(true), 2500);
    supabase
      .from('registered_agents')
      .select('email,role,allowed_modules,status,is_active')
      .ilike('email', email)
      .limit(8)
      .then(({ data, error }) => {
        window.clearTimeout(accessTimer);
        if (error) {
          console.error('[Admin] Could not load access profile:', error.message);
        }
        const rows = (data as Array<{ email?: string; role?: string; allowed_modules?: unknown }> | null) || [];
        const row =
          rows.find((item) => String(item.email || '').toLowerCase() === email.toLowerCase()) || rows[0];
        const nextRole = String(row?.role || fallbackRole);
        setRole(nextRole);
        setAllowedModules(parseModules(row?.allowed_modules));
        setAccessReady(true);
        const isStaff = /admin|full access|tour operator|content manager|limited access|\(user\)|^user$/i.test(nextRole);
        if (isStaff) return;
        if (row) router.replace('/agents/portal');
      })
      .catch((error) => {
        window.clearTimeout(accessTimer);
        console.error('[Admin] Could not load access profile:', error);
        setAccessReady(true);
      });
  }, [user]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('admin-sidebar-collapsed', next ? '1' : '0');
  }

  function canAccess(id: string) {
    return canAccessModule(
      id,
      role || String(user?.user_metadata?.role || ''),
      allowedModules,
      user?.email
    );
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      if (window.innerWidth < 768) {
        setMobileSearchOpen(true);
        window.setTimeout(() => mobileSearchRef.current?.focus(), 0);
        return;
      }
      searchRef.current?.focus();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
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
      <div className="flex h-dvh items-center justify-center bg-gray-50 font-ui dark:bg-gray-950">
        <AdminLogoLoader label="Loading dashboard" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50 font-ui dark:bg-gray-950">
        <AdminLogoLoader label="Redirecting to sign in" />
      </div>
    );
  }

  const displayName =
    String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim() ||
    user.email?.split('@')[0]?.replace(/\./g, ' ') ||
    'User';
  const initials = accountInitials(displayName);
  const roleLabel = (role || 'Member').replace(/_/g, ' ');
  const searchHits = headerQuery.trim()
    ? [...MAIN_COLLECTIONS, ...SYSTEM_COLLECTIONS].filter((item) => {
        if (!canAccess(item.id)) return false;
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
    <div className="admin-shell flex h-dvh overflow-hidden bg-gray-50 font-ui text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <AdminFavicon />
      {accessAlert && (
        <div className="fixed right-6 top-6 z-50 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {accessAlert}
        </div>
      )}
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh flex-col overflow-hidden border-r border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:static lg:z-40 lg:translate-x-0 ${
          collapsed ? 'w-72 lg:w-20' : 'w-72'
        } ${menuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className={`flex h-[72px] shrink-0 items-center border-b border-gray-100 px-4 dark:border-gray-800 ${collapsed ? 'justify-between lg:justify-center' : 'justify-between'}`}>
          <Link href="/admin" onClick={() => setMenuOpen(false)} className={collapsed ? 'lg:flex' : 'flex items-center gap-3'}>
            <BrandLogo size={collapsed ? 40 : 48} light={dark} />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-6 w-6" />
          </button>
          {!collapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="group/collapse hidden h-8 w-8 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all duration-300 hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#00A651] dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 lg:flex"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover/collapse:-translate-x-0.5" />
            </button>
          ) : null}
        </div>

        <nav className={`sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-visible px-3 py-4 ${collapsed ? 'lg:px-2' : ''}`}>
          {MAIN_COLLECTIONS.filter((item) => canAccess(item.id)).map((item) => {
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
                badge={item.id === 'notifications' && unreadNotifications > 0 ? unreadNotifications : undefined}
                onNavigate={() => setMenuOpen(false)}
                onGuard={guard}
              />
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-gray-100 p-3 dark:border-gray-800">
          {collapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Expand Sidebar"
              className="group/expand mx-auto mb-4 hidden h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-[#00A651] shadow-sm transition-all duration-300 hover:bg-[#00A651] hover:text-white hover:shadow-lg hover:shadow-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-400 lg:flex"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4 transition-transform group-hover/expand:translate-x-0.5" />
            </button>
          ) : null}
          <div className={`group mb-2 flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50 ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-[#00A651] text-sm font-semibold text-white shadow-md transition-transform group-hover:scale-105">
              {displayName.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold capitalize text-gray-900 dark:text-white">{displayName}</p>
              <p className="truncate text-[11px] font-medium capitalize text-gray-500 dark:text-gray-400">{roleLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Log Out"
            className={`flex w-full items-center gap-3 rounded-xl bg-red-50 px-3 py-2.5 text-red-600 transition-all duration-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 ${
              collapsed ? 'lg:justify-center' : ''
            }`}
          >
            <LogOut className="h-5 w-5" />
            <span className={`text-sm font-bold ${collapsed ? 'lg:hidden' : ''}`}>Log Out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-30 h-16 shrink-0 border-b border-gray-200/50 bg-white/80 backdrop-blur-lg dark:border-gray-800/50 dark:bg-gray-900/80 lg:h-[72px]">
          <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
              <Link href="/admin" className="lg:hidden">
                <BrandLogo size={40} light={dark} />
              </Link>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const first = searchHits[0];
                  if (first) goToCollection(first.id);
                }}
                className="relative hidden md:block"
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  value={headerQuery}
                  onChange={(event) => setHeaderQuery(event.target.value)}
                  placeholder="Search..."
                  className="h-10 w-64 rounded-xl border-none bg-gray-100 pl-10 pr-16 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:ring-2 focus:ring-[#00A651]/20 dark:bg-gray-800 dark:text-white lg:w-80"
                />
                <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700 lg:inline-flex">
                  ⌘K
                </kbd>
                {searchHits.length > 0 ? (
                  <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    {searchHits.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => goToCollection(item.id)}
                        className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </form>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSearchOpen((open) => !open)}
                className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              {canAccess('notifications') ? <NotificationBell /> : null}
              <div className="relative" ref={adminMenuRef}>
                <button
                  type="button"
                  onClick={() => setAdminMenuOpen((open) => !open)}
                  className="flex items-center gap-3 rounded-xl p-1.5 pr-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-expanded={adminMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-[#00A651] text-sm font-semibold text-white">
                    {initials}
                  </span>
                  <span className="hidden text-left lg:block">
                    <span className="block text-sm font-medium capitalize text-gray-900 dark:text-white">{displayName}</span>
                    <span className="block text-xs capitalize text-gray-500 dark:text-gray-400">{roleLabel}</span>
                  </span>
                </button>
                {adminMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="border-b border-gray-100 p-4 dark:border-gray-800">
                      <p className="font-semibold capitalize text-gray-900 dark:text-white">{displayName}</p>
                      <p className="truncate text-sm text-gray-500">{user.email}</p>
                    </div>
                    <div className="p-2">
                      {canAccess('profile') ? (
                        <Link
                          href="/admin/profile"
                          onClick={(event) => {
                            guard(event, 'profile');
                            setAdminMenuOpen(false);
                          }}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <User className="h-5 w-5" />
                          <span className="text-sm">Profile</span>
                        </Link>
                      ) : null}
                      {canAccess('settings') ? (
                        <Link
                          href="/admin/settings"
                          onClick={(event) => {
                            guard(event, 'settings');
                            setAdminMenuOpen(false);
                          }}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <Settings className="h-5 w-5" />
                          <span className="text-sm">Settings</span>
                        </Link>
                      ) : null}
                      {canAccess('user_management') ? (
                        <Link
                          href="/admin/user_management"
                          onClick={(event) => {
                            guard(event, 'user_management');
                            setAdminMenuOpen(false);
                          }}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <Shield className="h-5 w-5" />
                          <span className="text-sm">User Management</span>
                        </Link>
                      ) : null}
                      <Link
                        href="/"
                        target="_blank"
                        onClick={() => setAdminMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                      >
                        <ExternalLink className="h-5 w-5" />
                        <span className="text-sm">Back to Website</span>
                      </Link>
                    </div>
                    <div className="border-t border-gray-100 p-2 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminMenuOpen(false);
                          void signOut();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="text-sm">Log out</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {mobileSearchOpen ? (
            <div className="absolute left-0 right-0 top-full border-b border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:hidden">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const first = searchHits[0];
                  if (first) {
                    setMobileSearchOpen(false);
                    goToCollection(first.id);
                  }
                }}
                className="relative"
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  ref={mobileSearchRef}
                  value={headerQuery}
                  onChange={(event) => setHeaderQuery(event.target.value)}
                  placeholder="Search..."
                  className="h-10 w-full rounded-xl border-none bg-gray-100 pl-10 pr-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#00A651]/20 dark:bg-gray-800 dark:text-white"
                />
                {searchHits.length > 0 ? (
                  <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    {searchHits.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setMobileSearchOpen(false);
                          goToCollection(item.id);
                        }}
                        className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </form>
            </div>
          ) : null}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-950 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return <AdminShellInner>{children}</AdminShellInner>;
}
