export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { saveMediaFile } from '@/lib/media-store';

function hasAdminSession(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  return cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
}

export async function POST(request: Request) {
  if (!hasAdminSession(request)) {
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image upload failed.' },
      { status: 500 }
    );
  }
}
