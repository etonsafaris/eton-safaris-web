/** User-facing copy for failed admin uploads (Aiven `media_files`, not Supabase Storage). */
export function formatUploadErrorMessage(raw: unknown): string {
  const message =
    typeof raw === 'string'
      ? raw
      : raw instanceof Error
        ? raw.message
        : 'Image upload failed.';

  const lower = message.toLowerCase();

  if (/sign in|unauthorized|missing access token|invalid session/i.test(lower)) {
    return 'Your admin session expired. Sign out, sign in again, then upload the image.';
  }
  if (!message || /image upload failed\. check storage permissions/i.test(lower)) {
    return 'Image could not be saved. Sign in again, then retry. If it still fails, check DATABASE_URL on the server.';
  }
  if (/database_url is not configured|aiven database_url/i.test(lower)) {
    return 'Server database is not configured. Set DATABASE_URL in Vercel (Aiven PostgreSQL).';
  }
  if (/password authentication failed|authentication failed/i.test(lower)) {
    return 'Database login failed. Update DATABASE_URL in Vercel with the current Aiven password, then redeploy.';
  }
  if (/too many clients|connection slots|database is busy/i.test(lower)) {
    return 'Database is busy. Wait a few seconds and try the upload again.';
  }
  if (/timeout|timed out|abort/i.test(lower)) {
    return 'Upload timed out. Try a smaller image (under 4 MB) or retry in a moment.';
  }
  if (/files must be 8 mb|too large|payload too large|request entity too large/i.test(lower)) {
    return 'File is too large. Use a JPG, PNG, or WebP under 4 MB.';
  }
  if (/only png, jpeg|not allowed/i.test(lower)) {
    return message;
  }

  return message;
}

export function isLegacySupabaseStorageUrl(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return /supabase\.co\/storage/i.test(value.trim());
}
