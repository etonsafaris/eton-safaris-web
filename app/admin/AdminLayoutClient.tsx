'use client';

import { usePathname } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  if (pathname === '/admin/change-password') {
    return children;
  }
  return <AdminShell>{children}</AdminShell>;
}
