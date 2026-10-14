import { titleFromPublicSlug } from '@/lib/cms-routes';

export { revalidate } from '@/lib/public-page-config';

export function generateMetadata({ params }: { params: { slug: string } }) {
  return {
    title: titleFromPublicSlug(params.slug),
    alternates: { canonical: `/parks/${params.slug}` },
  };
}

export default function ParkDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
