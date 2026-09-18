import { randomBytes } from 'node:crypto';
import { db } from '@/lib/supabase/pool';

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

async function ensureTable() {
  if (tableReady) return;
  await db.query(CREATE_SQL);
  tableReady = true;
}

export function publicMediaPath(id: string) {
  return `/api/media/${id}`;
}

async function optimizeUpload(buffer: Buffer, mime: string, filename: string) {
  if (!mime.startsWith('image/') || /gif|svg|xml/i.test(mime)) {
    return { buffer, mime, filename };
  }
  try {
    const sharp = (await import('sharp')).default;
    const next = await sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72, effort: 4 })
      .toBuffer();
    return {
      buffer: next,
      mime: 'image/webp',
      filename: filename.replace(/\.[^.]+$/, '') + '.webp',
    };
  } catch {
    return { buffer, mime, filename };
  }
}

export async function saveMediaFile(file: File): Promise<string> {
  await ensureTable();
  const id = randomBytes(16).toString('hex');
  const optimized = await optimizeUpload(
    Buffer.from(await file.arrayBuffer()),
    file.type || 'application/octet-stream',
    file.name || `${id}.bin`
  );
  await db.query(
    'INSERT INTO media_files (id, filename, mime, bytes) VALUES ($1, $2, $3, $4)',
    [id, optimized.filename, optimized.mime, optimized.buffer]
  );
  return publicMediaPath(id);
}

export async function loadMediaFile(id: string) {
  if (!/^[a-f0-9]{32}$/i.test(id)) return null;
  await ensureTable();
  const result = await db.query<{ mime: string; bytes: Buffer; filename: string }>(
    'SELECT mime, bytes, filename FROM media_files WHERE id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] || null;
}
