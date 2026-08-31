'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { allGoogleLanguageCodes, PAGE_SOURCE_LANGUAGE } from '@/lib/site-translate';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages?: string;
            autoDisplay?: boolean;
          },
          elementId: string
        ) => void;
      };
    };
  }
}

export default function GoogleTranslateProvider() {
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: PAGE_SOURCE_LANGUAGE,
          includedLanguages: allGoogleLanguageCodes(),
          autoDisplay: false,
        },
        'google_translate_element'
      );
    };
  }, []);

  return (
    <>
      <div id="google_translate_element" className="sr-only" aria-hidden="true" />
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </>
  );
}
