import PublicShell from '@/components/public/PublicShell';
import { loadPublicNavDestinations } from '@/lib/load-public';

/** Server wrapper — preloads header/footer destinations for faster first paint. */
export default async function PublicShellServer({ children }: { children: React.ReactNode }) {
  const initialDestinations = await loadPublicNavDestinations();
  return <PublicShell initialDestinations={initialDestinations}>{children}</PublicShell>;
}
