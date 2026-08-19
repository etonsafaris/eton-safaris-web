'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BedDouble,
  Bell,
  Compass,
  Flag,
  Globe2,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Newspaper,
  Tag,
  TreePine,
  Users,
  X,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useAdminSession } from '@/components/admin/useAdminSession';
import { SITE } from '@/lib/collections';
import { clearAdminSessionCookieServer } from '@/lib/admin-session-sync';
import { supabase } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, match: (path: string) => path === '/admin' },
  { href: '/admin/tours', label: 'Tours', icon: Globe2, match: (path: string) => path.startsWith('/admin/tours') },
  { href: '/admin/safari_updates', label: 'Safari Updates', icon: Newspaper, match: (path: string) => path.includes('safari_updates') },
  { href: '/admin/countries', label: 'Countries', icon: Flag, match: (path: string) => path.includes('countries') },
  { href: '/admin/categories', label: 'Categories', icon: Tag, match: (path: string) => path.includes('categories') },
  { href: '/admin/national_park', label: 'National Parks', icon: TreePine, match: (path: string) => path.includes('national_park') },
  { href: '/admin/accommodations', label: 'Accommodations', icon: BedDouble, match: (path: string) => path.includes('accommodations') },
  { href: '/admin/explore', label: 'Explore', icon: Compass, match: (path: string) => path.includes('explore') },
  { href: '/admin/registered_agents', label: 'Agents', icon: Users, match: (path: string) => path.includes('registered_agents') || path.includes('agents') },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell, match: (path: string) => path.includes('notifications') },
  { href: '/admin/subscribers', label: 'Subscribers', icon: Mail, match: (path: string) => path.includes('subscribers') },
  { href: '/admin/pages', label: 'Pages', icon: MapPin, match: (path: string) => path.includes('/pages') && !path.includes('landing') },
  { href: '/admin/landing_pages', label: 'Landing Pages', icon: LayoutTemplate, match: (path: string) => path.includes('landing_pages') },
];

export default function AdminLightShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready } = useAdminSession();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await clearAdminSessionCookieServer();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#f3f4f6]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00A651] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = user.email?.split('@')[0]?.replace(/\./g, ' ') || 'Admin';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f3f4f6]">
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-[240px] flex-col border-r border-[#e5e7eb] bg-[#fafafa] transition-transform lg:static lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#e5e7eb] px-4 py-4">
          <Link href="/admin">
            <BrandLogo size={64} />
          </Link>
          <button type="button" onClick={() => setMenuOpen(false)} className="rounded p-1 hover:bg-[#f0fdf4] lg:hidden" aria-label="Close sidebar">
            <X className="h-4 w-4 text-[#6b7280]" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname || '');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-[#00A651] text-white shadow-sm'
                    : 'text-[#4b5563] hover:bg-[#f0fdf4] hover:text-[#111827]'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-[#6b7280]'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-[#e5e7eb] px-3 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00A651] text-sm font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold capitalize text-[#111827]">{displayName}</p>
              <p className="text-xs text-[#6b7280]">Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-red-500 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f3f4f6] lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-[#111827]">{SITE.name}</h1>
              <p className="text-xs text-[#6b7280]">Content Editor</p>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
