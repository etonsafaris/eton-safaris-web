import { rethrowDynamicServerError } from '@/lib/safe-public-load';
import { jsonLdFromRecord, findPublicRecord } from '@/lib/seo-public';
import { indexableContentKindForTable, shouldIndexPublicRecord } from '@/lib/public-indexing';
import type { SeoSchemaType } from '@/lib/seo';

export default async function JsonLd({
  table,
  slug,
  path,
  aliases = [],
  schemaHint,
}: {
  table: string;
  slug: string;
  path: string;
  aliases?: string[];
  schemaHint?: SeoSchemaType;
}) {
  try {
    const record = await findPublicRecord(table, slug, aliases);
    const kind = indexableContentKindForTable(table);
    if (kind && record && !shouldIndexPublicRecord(record, kind)) return null;
    const data = jsonLdFromRecord(record, { path, schemaHint, fallbackTitle: slug });
    if (!data) return null;
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
      />
    );
  } catch (error) {
    rethrowDynamicServerError(error);
    return null;
  }
}
