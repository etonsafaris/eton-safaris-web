import { redirect } from 'next/navigation';
import { pagePublicPath } from '@/lib/cms-routes';

export default function LegacyCmsPage({ params }: { params: { slug: string } }) {
  redirect(pagePublicPath(params.slug));
}
