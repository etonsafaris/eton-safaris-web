import ParksPageClient from '@/components/public/ParksPageClient';

export const revalidate = 60;

/** Avoid server-side park list queries — exact counts were timing out on Vercel. */
export default function ParksPage() {
  return <ParksPageClient initialParks={[]} initialTotal={0} />;
}
