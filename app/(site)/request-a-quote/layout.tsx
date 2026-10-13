import type { Metadata } from 'next';
import { metadataFromSeo } from '@/lib/seo-public';
import { defaultSeoValues } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const values = defaultSeoValues('page');
  values.seo_title = 'Request a Safari Quote - Eton Safaris, Tour, Travel, Hotel Booking, Uganda';
  values.meta_description =
    'Request a tailor-made safari quote from Eton Safaris. Share dates, travellers, and budget for gorilla trekking and wildlife tours in Uganda, Kenya, Tanzania, Rwanda, and beyond.';
  values.focus_keyphrase = 'request a safari quote';
  values.schema_type = 'WebPage';
  return metadataFromSeo(values, {
    title: values.seo_title,
    description: values.meta_description,
    path: '/request-a-quote',
  });
}

export default function RequestQuoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
