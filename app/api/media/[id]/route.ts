import { NextResponse } from 'next/server';
import { loadMediaFile } from '@/lib/media-store';
import { parseMediaQuality, parseMediaWidth, transformMediaBytes, wantsMediaTransform } from '@/lib/media-image';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const file = await loadMediaFile(context.params.id);
    if (!file) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const search = new URL(request.url).searchParams;
    let body = file.bytes;
    let mime = file.mime || 'application/octet-stream';

    if (wantsMediaTransform(search)) {
      const transformed = await transformMediaBytes(
        Buffer.isBuffer(body) ? body : Buffer.from(body),
        mime,
        parseMediaWidth(search.get('w')),
        parseMediaQuality(search.get('q'))
      ).catch(() => null);
      if (transformed) {
        body = transformed.bytes;
        mime = transformed.mime;
      }
    }

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(body.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${(file.filename || 'image').replace(/"/g, '')}"`,
        Vary: 'Accept',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Media could not be loaded.' },
      { status: 500 }
    );
  }
}
