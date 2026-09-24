'use client';

import { publicBodyHtml } from '@/lib/embedded-content';
import PublicHtml from '@/components/public/PublicHtml';
import { parseBlocksFromRecord, parseContentBlocks } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

export default function ContentBlocks({
  value,
  record,
}: {
  value?: unknown;
  record?: RecordRow | null;
}) {
  const blocks = record ? parseBlocksFromRecord(record) : parseContentBlocks(value);
  if (blocks.length === 0) return null;

  return (
    <div>
      {blocks.map((block, index) => (
        <section key={`${block.title}-${index}`}>
          {block.title && <h2 className="content-subheading">{block.title}</h2>}
          {block.description && (
            <PublicHtml className="public-prose max-w-none" html={publicBodyHtml(block.description)} />
          )}
        </section>
      ))}
    </div>
  );
}
