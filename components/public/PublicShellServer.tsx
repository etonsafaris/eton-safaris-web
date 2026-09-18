import PublicShell from '@/components/public/PublicShell';
import { loadPublicNavDestinations, loadSafariUpdatesNav } from '@/lib/load-public';

/** Server wrapper — preloads header/footer destinations for faster first paint. */
export default async function PublicShellServer({ children }: { children: React.ReactNode }) {
  const [initialDestinations, initialSafariUpdates] = await Promise.all([
    loadPublicNavDestinations(),
    loadSafariUpdatesNav(8),
  ]);
  return (
    <PublicShell initialDestinations={initialDestinations} initialSafariUpdates={initialSafariUpdates}>
      {children}
    </PublicShell>
  );
}
