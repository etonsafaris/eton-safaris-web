export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { allowAdminRequest } from '@/lib/admin-request-auth';
import { saveMediaFile } from '@/lib/media-store';
import { formatUploadErrorMessage } from '@/lib/upload-error-message';

export async function POST(request: Request) {
  if (!(await allowAdminRequest(request))) {
    return NextResponse.json({ error: 'Sign in to upload images.' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size < 1) {
      return NextResponse.json({ error: 'Choose an image or video file to upload.' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Files must be 8 MB or smaller after optimization.' }, { status: 400 });
    }

    const url = await saveMediaFile(file);
    return NextResponse.json({ url });
  } catch (error) {
    const message = formatUploadErrorMessage(error);
    const status = /busy|too many clients|timeout/i.test(message) ? 503 : 500;
    console.error('[Upload] Failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: message }, { status });
  }
}
