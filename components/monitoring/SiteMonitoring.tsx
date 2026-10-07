'use client';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

/**
 * Vercel Analytics + Speed Insights (active on Vercel when enabled in the project).
 * GA4 loads only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set in Vercel env.
 */
export default function SiteMonitoring() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
      {gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4-config" strategy="afterInteractive">
            {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { anonymize_ip: true, send_page_view: true });
`}
          </Script>
        </>
      ) : null}
    </>
  );
}
