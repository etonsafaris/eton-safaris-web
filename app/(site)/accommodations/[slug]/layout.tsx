import { titleFromPublicSlug } from '@/lib/cms-routes';

export { revalidate } from '@/lib/public-page-config';

export function generateMetadata({ params }: { params: { slug: string } }) {
  return {
    title: titleFromPublicSlug(params.slug),
    alternates: { canonical: `/accommodations/${params.slug}` },
  };
}

export default function AccommodationDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
