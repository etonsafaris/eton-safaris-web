'use client';

import LandingSeoClient from '@/components/public/LandingSeoClient';

export default function LandingSeoPage({ params }: { params: { slug: string } }) {
  return <LandingSeoClient slug={params.slug} />;
}
