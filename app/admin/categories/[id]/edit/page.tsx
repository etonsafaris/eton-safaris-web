'use client';

import { useParams } from 'next/navigation';
import CategoryForm from '@/components/admin/CategoryForm';

export default function EditCategoryPage() {
  const params = useParams<{ id: string }>();
  const categoryId = params?.id || '';

  return <CategoryForm categoryId={categoryId} />;
}
