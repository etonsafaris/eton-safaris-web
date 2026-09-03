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
    let container = document.getElementById('google_translate_element');
    if (!container) {
      container = document.createElement('div');
      container.id = 'google_translate_element';
      container.setAttribute('aria-hidden', 'true');
      container.style.display = 'none';
      document.body.appendChild(container);
    }

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

    // Google Translate owns the injected DOM. Do not let React reconcile it.
    return () => {
      if (window.googleTranslateElementInit) delete window.googleTranslateElementInit;
    };
  }, []);

  return (
    <>
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </>
  );
}
