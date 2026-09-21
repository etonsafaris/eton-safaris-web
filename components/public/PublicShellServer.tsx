import PublicShell from '@/components/public/PublicShell';
import { loadPublicNavDestinations } from '@/lib/load-public';
import type { PublicDestination } from '@/lib/public-destinations';

/** Server wrapper — preloads header/footer destinations for faster first paint. */
export default async function PublicShellServer({ children }: { children: React.ReactNode }) {
  let initialDestinations: PublicDestination[] = [];
  try {
    initialDestinations = await loadPublicNavDestinations();
  } catch (error) {
    console.error('[Public] Nav destinations failed (using empty shell):', error);
  }
  return <PublicShell initialDestinations={initialDestinations}>{children}</PublicShell>;
}
