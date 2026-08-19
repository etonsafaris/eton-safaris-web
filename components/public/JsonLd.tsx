import { jsonLdFromRecord, findPublicRecord } from '@/lib/seo-public';
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
    const data = jsonLdFromRecord(record, { path, schemaHint, fallbackTitle: slug });
    if (!data) return null;
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
      />
    );
  } catch {
    return null;
  }
}
