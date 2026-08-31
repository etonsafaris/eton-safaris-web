'use client';

import { Globe } from 'lucide-react';
import { useSiteTranslate } from '@/components/public/SiteTranslateRoot';

type SiteTranslateButtonProps = {
  variant?: 'header' | 'menu';
  onNavigate?: () => void;
};

export default function SiteTranslateButton({ variant = 'header', onNavigate }: SiteTranslateButtonProps) {
  const translate = useSiteTranslate();
  if (!translate) return null;

  if (variant === 'menu') {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-2 py-2 text-left text-[#222]"
        onClick={() => {
          translate.openMenu();
          onNavigate?.();
        }}
      >
        <Globe className="h-4 w-4 shrink-0 text-[#00A651]" aria-hidden="true" />
        <span>Translate page</span>
        <span className="ml-auto text-xs text-[#666]">{translate.activeLanguageLabel}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="site-nav-item site-nav-item--button"
      onClick={translate.openMenu}
      aria-label={`Translate page — currently ${translate.activeLanguageLabel}`}
      title="Translate page"
    >
      <Globe className="inline h-3.5 w-3.5" aria-hidden="true" /> Translate
    </button>
  );
}
