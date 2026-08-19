import JsonLd from '@/components/public/JsonLd';
import { publicRecordMetadata } from '@/lib/seo-public';

type LayoutProps = {
  children: React.ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return publicRecordMetadata('explore', params.slug, `/explore/${params.slug}`);
}

export default function ExploreSeoLayout({ children, params }: LayoutProps) {
  return (
    <>
      <JsonLd table="explore" slug={params.slug} path={`/explore/${params.slug}`} schemaHint="TouristAttraction" />
      {children}
    </>
  );
}
