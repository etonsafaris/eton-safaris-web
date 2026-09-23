export type AdminThemeSetting = 'light' | 'dark' | 'system';

export const ADMIN_THEME_STORAGE_KEY = 'admin-theme';

export function resolveAdminTheme(setting: AdminThemeSetting): 'light' | 'dark' {
  if (setting === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return setting;
}

export function applyAdminTheme(actual: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', actual);
  root.classList.toggle('dark', actual === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', actual === 'dark' ? '#030712' : '#f9fafb');
  }
}

export function readStoredAdminTheme(): AdminThemeSetting {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  return 'light';
}
