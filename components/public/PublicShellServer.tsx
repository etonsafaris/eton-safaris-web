import PublicShell from '@/components/public/PublicShell';
import { loadPublicNavDestinations } from '@/lib/load-public';
import type { PublicDestination } from '@/lib/public-destinations';

/** Server wrapper — preloads header/footer destinations for faster first paint. */
export default async function PublicShellServer({
  children,
  initialDestinations,
}: {
  children: React.ReactNode;
  /** When the page already loaded countries (e.g. home), skip a duplicate DB round-trip. */
  initialDestinations?: PublicDestination[];
}) {
  let destinations = initialDestinations;
  if (!destinations?.length) {
    destinations = [];
    try {
      destinations = await loadPublicNavDestinations();
    } catch (error) {
      console.error('[Public] Nav destinations failed (using empty shell):', error);
    }
  }
  return <PublicShell initialDestinations={destinations}>{children}</PublicShell>;
}
