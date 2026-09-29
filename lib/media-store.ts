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

export async function ensureMediaFilesTable(client: import('pg').PoolClient) {
  if (tableReady) return;
  await client.query(CREATE_SQL);
  tableReady = true;
}

function wrapMediaStoreError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/password authentication failed/i.test(message)) {
    return new Error('password authentication failed for database user (check DATABASE_URL)');
  }
  if (/relation "media_files" does not exist/i.test(message)) {
    return new Error('media_files table is missing and could not be created (check database permissions)');
  }
  return error instanceof Error ? error : new Error(message);
}

export async function saveMediaFile(file: File): Promise<string> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('Aiven DATABASE_URL is not configured.');
  }

  const id = randomBytes(16).toString('hex');
  const mime = file.type || 'application/octet-stream';
  const filename = file.name || `${id}.bin`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const maxBytes = 6 * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new Error('Files must be 8 MB or smaller after optimization.');
  }

  try {
    await withPgRetry(() =>
      withPgClient(async (client) => {
        await ensureMediaFilesTable(client);
        await client.query('SET LOCAL statement_timeout = 60000');
        await client.query(
          'INSERT INTO media_files (id, filename, mime, bytes) VALUES ($1, $2, $3, $4)',
          [id, filename, mime, buffer]
        );
      })
    );
  } catch (error) {
    throw wrapMediaStoreError(error);
  }

  return publicMediaPath(id);
}

export async function loadMediaFile(id: string) {
  if (!/^[a-f0-9]{32}$/i.test(id)) return null;
  const result = await withPgRetry(() =>
    withPgClient(async (client) => {
      await ensureMediaFilesTable(client);
      return client.query<{ mime: string; bytes: Buffer; filename: string }>(
        'SELECT mime, bytes, filename FROM media_files WHERE id = $1 LIMIT 1',
        [id]
      );
    })
  );
  return result.rows[0] || null;
}
