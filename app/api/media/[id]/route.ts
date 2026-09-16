import { NextResponse } from 'next/server';
import { loadMediaFile } from '@/lib/media-store';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const file = await loadMediaFile(context.params.id);
    if (!file) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const body = file.bytes;
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': file.mime || 'application/octet-stream',
        'Content-Length': String(body.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${(file.filename || 'image').replace(/"/g, '')}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Media could not be loaded.' },
      { status: 500 }
    );
  }
}
