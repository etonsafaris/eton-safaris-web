'use client';

import { Home } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import PublicContactLines from '@/components/public/PublicContactLines';
import { useHomePageContent } from '@/components/public/useHomePageContent';
import { publicEmails, publicPhones } from '@/lib/home-page-content';

type PaymentPortalShellProps = {
  step: 1 | 2 | 3;
  children: React.ReactNode;
};

const STEPS = [
  { n: 1, label: 'Enter Details' },
  { n: 2, label: 'Make Payment' },
  { n: 3, label: 'Confirmation' },
] as const;

export default function PaymentPortalShell({ step, children }: PaymentPortalShellProps) {
  const home = useHomePageContent();
  const phones = publicPhones(home);
  const emails = publicEmails(home);
  return (
    <div className="min-h-screen bg-[#f3f3f3]">
      <header className="border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-4 py-4 sm:px-6">
          <BrandLogo size={64} />
          <div className="flex items-center gap-3">
            <img
              src="https://www.pesapal.com/wp-content/uploads/2021/06/norton-secured.png"
              alt="Norton Secured"
              width={128}
              height={32}
              loading="lazy"
              decoding="async"
              className="h-8 object-contain opacity-80"
            />
            <img
              src="https://www.pesapal.com/wp-content/uploads/2021/06/pci-dss.png"
              alt="PCI DSS"
              width={128}
              height={32}
              loading="lazy"
              decoding="async"
              className="h-8 object-contain opacity-80"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[980px] px-4 py-8 sm:px-6">
        <ol className="mb-8 flex items-start justify-between gap-2">
          {STEPS.map((item, index) => {
            const active = step === item.n;
            const done = step > item.n;
            return (
              <li key={item.n} className="flex flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  {index > 0 ? (
                    <span className={`h-0.5 flex-1 ${done || active ? 'bg-[#8f2742]' : 'bg-[#d9d9d9]'}`} />
                  ) : (
                    <span className="flex-1" />
                  )}
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
                      active || done ? 'bg-[#8f2742]' : 'bg-[#bdbdbd]'
                    }`}
                  >
                    {item.n}
                  </span>
                  {index < STEPS.length - 1 ? (
                    <span className={`h-0.5 flex-1 ${done ? 'bg-[#8f2742]' : 'bg-[#d9d9d9]'}`} />
                  ) : (
                    <span className="flex-1" />
                  )}
                </div>
                <p
                  className={`mt-2 text-xs font-semibold uppercase tracking-wide sm:text-sm ${
                    active ? 'text-[#8f2742]' : 'text-[#888]'
                  }`}
                >
                  {item.label}
                </p>
              </li>
            );
          })}
        </ol>

        {children}

        <div className="mt-10 border-t border-[#e5e5e5] pt-6 text-sm text-[#666]">
          <div className="mt-4 flex flex-col gap-3">
            <p className="inline-flex items-center gap-2">
              <Home className="h-4 w-4 text-[#8f2742]" />
              {home.ready ? home.contactAddress : ''}
            </p>
            <PublicContactLines
              phones={phones}
              emails={emails}
              rowClassName="inline-flex items-center gap-2 hover:text-[#8f2742]"
              iconClassName="h-4 w-4 shrink-0 text-[#8f2742]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
