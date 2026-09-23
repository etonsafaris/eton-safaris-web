'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  ADMIN_THEME_STORAGE_KEY,
  applyAdminTheme,
  readStoredAdminTheme,
  resolveAdminTheme,
  type AdminThemeSetting,
} from '@/lib/admin-theme';

type AdminThemeContextValue = {
  theme: AdminThemeSetting;
  actualTheme: 'light' | 'dark';
  setTheme: (next: AdminThemeSetting) => void;
  toggleTheme: () => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminThemeSetting>('light');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  useLayoutEffect(() => {
    const stored = readStoredAdminTheme();
    const actual = resolveAdminTheme(stored);
    setThemeState(stored);
    setActualTheme(actual);
    applyAdminTheme(actual);
  }, []);

  useEffect(() => {
    applyAdminTheme(actualTheme);
  }, [actualTheme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setActualTheme(resolveAdminTheme('system'));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: AdminThemeSetting) => {
    setThemeState(next);
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, next);
    setActualTheme(resolveAdminTheme(next));
  }, []);

  const toggleTheme = useCallback(() => {
    const next = actualTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [actualTheme, setTheme]);

  const value = useMemo(
    () => ({ theme, actualTheme, setTheme, toggleTheme }),
    [theme, actualTheme, setTheme, toggleTheme]
  );

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    throw new Error('useAdminTheme must be used within AdminThemeProvider');
  }
  return ctx;
}
