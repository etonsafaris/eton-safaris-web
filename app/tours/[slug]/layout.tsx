import JsonLd from '@/components/public/JsonLd';
import { publicRecordMetadata } from '@/lib/seo-public';

type LayoutProps = {
  children: React.ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return publicRecordMetadata('tours', params.slug, `/tours/${params.slug}`);
}

export default function TourSeoLayout({ children, params }: LayoutProps) {
  return (
    <>
      <JsonLd table="tours" slug={params.slug} path={`/tours/${params.slug}`} schemaHint="TouristTrip" />
      {children}
    </>
  );
}
