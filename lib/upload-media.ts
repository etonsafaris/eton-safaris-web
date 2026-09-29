import { syncAdminSessionCookie } from '@/lib/admin-session-sync';
import { optimizeImageFile } from '@/lib/image-optimize';
import { isPgTooManyClientsError } from '@/lib/pg-retry';
import { supabase } from '@/lib/supabase/client';
import { readStoredAccessToken } from '@/lib/supabase/jwt-payload';
import { formatUploadErrorMessage } from '@/lib/upload-error-message';

async function uploadViaApi(file: File, folder: string) {
  const sessionOk = await syncAdminSessionCookie().catch(() => false);
  if (!sessionOk) {
    await syncAdminSessionCookie().catch(() => false);
  }

  const token =
    (await supabase.auth.getSession()).data.session?.access_token || readStoredAccessToken();

  async function postOnce() {
    const body = new FormData();
    body.append('file', file);
    body.append('folder', folder);
    return fetch('/api/upload', {
      method: 'POST',
      body,
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  }

  let response = await postOnce();
  if (response.status === 401) {
    await syncAdminSessionCookie(token);
    response = await postOnce();
  }

  const rawText = await response.text().catch(() => '');
  let payload: { url?: string; error?: string } = {};
  try {
    payload = rawText ? (JSON.parse(rawText) as { url?: string; error?: string }) : {};
  } catch {
    payload = {};
  }
  if (!response.ok || !payload.url) {
    const message = formatUploadErrorMessage(
      payload.error ||
        (rawText && !rawText.startsWith('{') ? rawText.slice(0, 200) : '') ||
        `Upload failed (${response.status})`
    );
    throw new Error(message);
  }
  return payload.url;
}

async function uploadViaApiWithRetry(file: File, folder: string) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await uploadViaApi(file, folder);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Upload failed');
      if (!isPgTooManyClientsError(lastError) || attempt >= 3) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError || new Error('Image upload failed.');
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
    return uploadViaApiWithRetry(compressed, folder);
  }
  return uploadOptimizedImage(file, folder);
}

export async function uploadOptimizedImage(file: File, folder: string): Promise<string> {
  const optimized = await optimizeImageFile(file).catch(() => file);
  try {
    return await uploadViaApiWithRetry(optimized, folder);
  } catch (apiError) {
    console.error('[Upload] Optimized upload failed, retrying original file:', apiError);
    return await uploadViaApiWithRetry(file, folder);
  }
}
