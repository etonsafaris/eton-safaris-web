import { publicPathsForSavedRow } from '@/lib/revalidate-public-cms';

/** Public IndexNow key. The same value is served at /{key}.txt */
export const INDEXNOW_KEY = '4fb8b965eb174c3bb8b142a8c2dc4096';

const INDEXNOW_HOST = 'www.etonsafaris.com';
const INDEXNOW_ORIGIN = `https://${INDEXNOW_HOST}`;

function absoluteUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${INDEXNOW_ORIGIN}${clean}`;
}

/** Tell IndexNow that these public paths were published, updated, or removed. */
export async function notifyIndexNow(paths: Array<string | null | undefined>): Promise<void> {
  const urlList = [...new Set(paths.filter((path): path is string => Boolean(path)).map(absoluteUrl))];
  if (!urlList.length) return;

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${INDEXNOW_ORIGIN}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });
    if (!response.ok && response.status !== 202) {
      console.warn('[IndexNow] notify failed', response.status);
    }
  } catch (error) {
    console.warn('[IndexNow] notify failed', error);
  }
}

export function indexNowPathsForRecord(table: string, record?: Record<string, unknown> | null): string[] {
  return publicPathsForSavedRow(table, record);
}
