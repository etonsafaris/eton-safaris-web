import JsonLd from '@/components/public/JsonLd';
import { publicRecordMetadata } from '@/lib/seo-public';

type LayoutProps = {
  children: React.ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return publicRecordMetadata('accommodations', params.slug, `/accommodations/${params.slug}`);
}

export default function AccommodationSeoLayout({ children, params }: LayoutProps) {
  return (
    <>
      <JsonLd
        table="accommodations"
        slug={params.slug}
        path={`/accommodations/${params.slug}`}
        schemaHint="LodgingBusiness"
      />
      {children}
    </>
  );
}
