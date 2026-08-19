import JsonLd from '@/components/public/JsonLd';
import { publicRecordMetadata } from '@/lib/seo-public';

type LayoutProps = {
  children: React.ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return publicRecordMetadata('national_park', params.slug, `/parks/${params.slug}`, {
    aliases: ['national_parks', 'parks'],
  });
}

export default function ParkSeoLayout({ children, params }: LayoutProps) {
  return (
    <>
      <JsonLd
        table="national_park"
        slug={params.slug}
        path={`/parks/${params.slug}`}
        aliases={['national_parks', 'parks']}
        schemaHint="TouristAttraction"
      />
      {children}
    </>
  );
}
