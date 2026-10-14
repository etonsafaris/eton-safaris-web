import { titleFromPublicSlug } from '@/lib/cms-routes';

export { revalidate } from '@/lib/public-page-config';

export function generateMetadata({ params }: { params: { slug: string } }) {
  return {
    title: titleFromPublicSlug(params.slug),
    alternates: { canonical: `/safari-updates/${params.slug}` },
  };
}

export default function SafariUpdateDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
