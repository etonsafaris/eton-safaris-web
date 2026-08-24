import { optimizeImageFile } from '@/lib/image-optimize';
import { supabase } from '@/lib/supabase/client';

const BUCKETS = ['media', 'images', 'uploads', 'public'];

function extensionFor(file: File) {
  if (file.type.includes('webp') || file.name.endsWith('.webp')) return 'webp';
  if (file.type.includes('png')) return 'png';
  if (file.type.includes('gif')) return 'gif';
  return 'jpg';
}

async function uploadToBucket(file: File, folder: string, bucket: string) {
  const ext = extensionFor(file);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || `image/${ext}`,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function uploadFile(file: File, folder: string) {
  let lastError: Error | null = null;
  for (const bucket of BUCKETS) {
    try {
      return await uploadToBucket(file, folder, bucket);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Upload failed');
    }
  }
  throw lastError || new Error('Image upload failed. Check storage permissions.');
}

async function uploadViaApi(file: File, folder: string) {
  const body = new FormData();
  body.append('file', file);
  body.append('folder', folder);
  const response = await fetch('/api/upload', { method: 'POST', body });
  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || 'Image upload failed. Check storage permissions.');
  }
  return payload.url;
}

export async function uploadMediaFile(
  file: File,
  folder: string,
  options?: { onStatus?: (status: string) => void }
): Promise<string> {
  if (file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name)) {
    options?.onStatus?.('Compressing video for faster loading…');
    const { optimizeVideoFile } = await import('@/lib/video-optimize');
    const compressed = await optimizeVideoFile(file, { onStatus: options?.onStatus }).catch((error) => {
      console.error('[Upload] Video compression failed, uploading original:', error);
      options?.onStatus?.('Compression skipped. Uploading original…');
      return file;
    });
    options?.onStatus?.('Uploading video…');
    return uploadViaApi(compressed, folder);
  }
  return uploadOptimizedImage(file, folder);
}

export async function uploadOptimizedImage(file: File, folder: string): Promise<string> {
  const optimized = await optimizeImageFile(file).catch(() => file);
  try {
    return await uploadViaApi(optimized, folder);
  } catch (apiError) {
    console.error('[Supabase] Admin upload API failed, retrying original file:', apiError);
    try {
      return await uploadViaApi(file, folder);
    } catch (retryError) {
      console.error('[Supabase] Admin upload API retry failed:', retryError);
      try {
        return await uploadFile(optimized, folder);
      } catch {
        const message =
          retryError instanceof Error ? retryError.message : 'Image upload failed. Check storage permissions.';
        throw new Error(message);
      }
    }
  }
}
