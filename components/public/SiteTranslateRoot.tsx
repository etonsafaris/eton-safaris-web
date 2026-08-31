'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Globe } from 'lucide-react';
import { usePathname } from 'next/navigation';
import GoogleTranslateProvider from '@/components/public/GoogleTranslateProvider';
import SiteTranslatePanel from '@/components/public/SiteTranslatePanel';
import { languageByCode, readActiveTranslateLanguage } from '@/lib/site-translate';

const HIDDEN_PREFIXES = ['/admin', '/login', '/dashboard', '/agents/portal'];

type TranslateUiContext = {
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  activeLanguageLabel: string;
};

const TranslateUiContext = createContext<TranslateUiContext | null>(null);

export function useSiteTranslate() {
  return useContext(TranslateUiContext);
}

function TranslateFab({
  open,
  onToggle,
  activeLanguageLabel,
}: {
  open: boolean;
  onToggle: () => void;
  activeLanguageLabel: string;
}) {
  return (
    <div className="site-translate-widget">
      <button
        type="button"
        onClick={onToggle}
        className="site-translate-trigger"
        aria-expanded={open}
        aria-label={open ? 'Close translate menu' : `Translate page — currently ${activeLanguageLabel}`}
        title={`Translate (${activeLanguageLabel})`}
      >
        <Globe className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );
}

function TranslateUi({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [panelAnchor, setPanelAnchor] = useState<'fab' | 'header'>('fab');
  const [activeLanguageLabel, setActiveLanguageLabel] = useState('English');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const code = readActiveTranslateLanguage();
    setActiveLanguageLabel(languageByCode(code)?.nativeName || 'English');
  }, []);

  const openMenu = useCallback((anchor: 'fab' | 'header' = 'fab') => {
    setPanelAnchor(anchor);
    setOpen(true);
  }, []);

  const closeMenu = useCallback(() => setOpen(false), []);
  const toggleMenu = useCallback(() => {
    setPanelAnchor('fab');
    setOpen((value) => !value);
  }, []);

  const value = useMemo(
    () => ({
      open,
      openMenu: () => openMenu('header'),
      closeMenu,
      toggleMenu,
      activeLanguageLabel,
    }),
    [open, openMenu, closeMenu, toggleMenu, activeLanguageLabel]
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <TranslateUiContext.Provider value={value}>
      <div ref={rootRef}>
        {children}
        <div className={`site-translate-mount site-translate-mount--${panelAnchor}`}>
          <SiteTranslatePanel open={open} onClose={closeMenu} anchor={panelAnchor} />
        </div>
        <TranslateFab open={open} onToggle={toggleMenu} activeLanguageLabel={activeLanguageLabel} />
      </div>
    </TranslateUiContext.Provider>
  );
}

export default function SiteTranslateRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';
  const enabled = !HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!enabled) return <>{children}</>;

  return (
    <>
      <GoogleTranslateProvider />
      <TranslateUi>{children}</TranslateUi>
    </>
  );
}
