import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { createAdminClient, createServiceClient } from '@/lib/supabase/admin';

const BUCKETS = ['media', 'images', 'uploads', 'public'];

function hasAdminSession(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  return cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
}

function extensionFor(file: File) {
  const name = file.name.toLowerCase();
  if (file.type.includes('webp') || name.endsWith('.webp')) return 'webp';
  if (file.type.includes('png') || name.endsWith('.png')) return 'png';
  if (file.type.includes('gif') || name.endsWith('.gif')) return 'gif';
  return 'jpg';
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
      return NextResponse.json({ error: 'Choose an image file to upload.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extensionFor(file);
    const objectPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    try {
      const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : createAdminClient();
      const { data: bucketList } = await supabase.storage.listBuckets();
      const existing = new Set((bucketList || []).map((item) => item.name));
      let bucket = BUCKETS.find((name) => existing.has(name));

      if (!bucket) {
        const created = await supabase.storage.createBucket('media', { public: true, fileSizeLimit: 10 * 1024 * 1024 });
        if (created.error && !/already exists/i.test(created.error.message)) {
          throw created.error;
        }
        bucket = 'media';
      }

      let { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
        contentType: file.type || `image/${ext}`,
        upsert: true,
      });

      if (error && /row-level security|rls/i.test(error.message)) {
        await supabase.storage.updateBucket(bucket, { public: true, fileSizeLimit: 10 * 1024 * 1024 }).catch(() => null);
        const retry = await supabase.storage.from(bucket).upload(objectPath, buffer, {
          contentType: file.type || `image/${ext}`,
          upsert: true,
        });
        error = retry.error;
      }

      if (!error) {
        const publicUrl = supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
        return NextResponse.json({ url: publicUrl });
      }

      console.error('[Upload] Storage upload failed:', error.message);
      if (process.env.VERCEL) {
        return NextResponse.json(
          {
            error:
              'Image upload needs a public Supabase Storage bucket. Add SUPABASE_SERVICE_ROLE_KEY in Vercel, then run scripts/fix-storage-rls.sql.',
          },
          { status: 500 }
        );
      }
    } catch (storageError) {
      console.error('[Upload] Storage upload failed, using local media folder:', storageError);
      if (process.env.VERCEL) {
        return NextResponse.json(
          {
            error:
              'Image upload needs a public Supabase Storage bucket. Add SUPABASE_SERVICE_ROLE_KEY in Vercel, then run scripts/fix-storage-rls.sql.',
          },
          { status: 500 }
        );
      }
    }

    const localUrl = await saveLocalFile(file, folder);
    return NextResponse.json({ url: localUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image upload failed.' },
      { status: 500 }
    );
  }
}
