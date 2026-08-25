import { adminAuthHeaders, fetchAdminTable } from '@/lib/admin-records-client';
import { fetchCollectionRecords } from '@/lib/data';

export const DEMO_BOOKING_CODE = 'DEMO-ETON-001';

/** Ensure a complete sample booking exists (admin API, bypasses RLS). */
export async function ensureDemoBooking() {
  try {
    let rows: Awaited<ReturnType<typeof fetchAdminTable>> = [];
    try {
      rows = await fetchAdminTable('bookings');
    } catch {
      rows = await fetchCollectionRecords('bookings');
    }
    const exists = rows.some(
      (row) => String(row.booking_code || '').toUpperCase() === DEMO_BOOKING_CODE
    );
    if (exists) return 0;

    const response = await fetch('/api/admin/demo-booking', {
      method: 'POST',
      credentials: 'include',
      headers: await adminAuthHeaders(),
    });
    const body = (await response.json().catch(() => ({}))) as { created?: boolean; error?: string };
    if (!response.ok) {
      console.error('[Demo booking]', body.error || response.status);
      return 0;
    }
    return body.created ? 1 : 0;
  } catch (error) {
    console.error('[Demo booking] Failed:', error);
    return 0;
  }
}
