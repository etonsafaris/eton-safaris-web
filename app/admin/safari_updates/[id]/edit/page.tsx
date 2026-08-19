'use client';

import { useParams } from 'next/navigation';
import SafariUpdateForm from '@/components/admin/SafariUpdateForm';

export default function EditSafariUpdatePage() {
  const params = useParams<{ id: string }>();
  const postId = params?.id || '';

  return <SafariUpdateForm postId={postId} />;
}
