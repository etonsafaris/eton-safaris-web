import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKETS = ['media', 'images', 'uploads', 'public'];

function hasAdminSession(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  return cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
}

function extensionFor(file: File) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (type.includes('mp4') || name.endsWith('.mp4') || name.endsWith('.m4v')) return 'mp4';
  if (type.includes('webm') || name.endsWith('.webm')) return 'webm';
  if (type.includes('quicktime') || name.endsWith('.mov')) return 'mov';
  if (type.includes('webp') || name.endsWith('.webp')) return 'webp';
  if (type.includes('png') || name.endsWith('.png')) return 'png';
  if (type.includes('gif') || name.endsWith('.gif')) return 'gif';
  return 'jpg';
}

function isVideoFile(file: File) {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

async function saveLocalFile(file: File, folder: string) {
  const ext = extensionFor(file);
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const relativeDir = path.join('media', folder);
  const dir = path.join(process.cwd(), 'public', relativeDir);
  await mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, name);
  await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));
  return `/${relativeDir.replace(/\\/g, '/')}/${name}`;
}

export async function POST(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: 'Sign in to upload images.' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    const folder = String(form.get('folder') || 'uploads').replace(/[^a-z0-9/_-]/gi, '') || 'uploads';
    if (!(file instanceof File) || file.size < 1) {
      return NextResponse.json({ error: 'Choose an image or video file to upload.' }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Files must be 50 MB or smaller.' }, { status: 400 });
    }

    // Use local file storage with Aiven (no Supabase storage)
    const localUrl = await saveLocalFile(file, folder);
    return NextResponse.json({ url: localUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image upload failed.' },
      { status: 500 }
    );
  }
}
