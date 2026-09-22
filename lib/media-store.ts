import { randomBytes } from 'node:crypto';
import { withPgRetry } from '@/lib/pg-retry';
import { withPgClient } from '@/lib/supabase/pool';

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS media_files (
  id VARCHAR(40) PRIMARY KEY,
  filename TEXT,
  mime TEXT NOT NULL,
  bytes BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
`;

let tableReady = false;

export function publicMediaPath(id: string) {
  return `/api/media/${id}`;
}

export async function saveMediaFile(file: File): Promise<string> {
  const id = randomBytes(16).toString('hex');
  const mime = file.type || 'application/octet-stream';
  const filename = file.name || `${id}.bin`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await withPgRetry(() =>
    withPgClient(async (client) => {
      if (!tableReady) {
        await client.query(CREATE_SQL);
        tableReady = true;
      }
      await client.query('SET LOCAL statement_timeout = 60000');
      await client.query(
        'INSERT INTO media_files (id, filename, mime, bytes) VALUES ($1, $2, $3, $4)',
        [id, filename, mime, buffer]
      );
    })
  );

  return publicMediaPath(id);
}

export async function loadMediaFile(id: string) {
  if (!/^[a-f0-9]{32}$/i.test(id)) return null;
  const result = await withPgRetry(() =>
    withPgClient(async (client) => {
      if (!tableReady) {
        await client.query(CREATE_SQL);
        tableReady = true;
      }
      return client.query<{ mime: string; bytes: Buffer; filename: string }>(
        'SELECT mime, bytes, filename FROM media_files WHERE id = $1 LIMIT 1',
        [id]
      );
    })
  );
  return result.rows[0] || null;
}
