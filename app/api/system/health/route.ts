export const dynamic = 'force-dynamic';

import { healthGetResponse } from '@/lib/api-health';
export const runtime = 'nodejs';
export const maxDuration = 15;

export async function GET(request: Request) {
  return healthGetResponse(request);
}
