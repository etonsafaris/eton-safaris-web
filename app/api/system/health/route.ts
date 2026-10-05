export const dynamic = 'force-dynamic';

import { healthGetResponse } from '@/lib/api-health';

export async function GET(request: Request) {
  return healthGetResponse(request);
}
