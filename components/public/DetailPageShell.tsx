'use client';

import PublicShell from '@/components/public/PublicShell';

/** When `embedded`, parent already rendered PublicShellServer — skip duplicate header/footer. */
export default function DetailPageShell({
  embedded,
  children,
}: {
  embedded?: boolean;
  children: React.ReactNode;
}) {
  if (embedded) return <>{children}</>;
  return <PublicShell>{children}</PublicShell>;
}
