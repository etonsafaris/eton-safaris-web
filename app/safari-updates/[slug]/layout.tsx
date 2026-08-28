import JsonLd from '@/components/public/JsonLd';
import { publicRecordMetadata } from '@/lib/seo-public';

type LayoutProps = {
  children: React.ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return publicRecordMetadata('safari_updates', params.slug, `/safari-updates/${params.slug}`, {
    contentType: 'article',
  });
}

export default function SafariUpdateSeoLayout({ children, params }: LayoutProps) {
  return (
    <>
      <JsonLd
        table="safari_updates"
        slug={params.slug}
        path={`/safari-updates/${params.slug}`}
        schemaHint="Article"
      />
      {children}
    </>
  );
}
