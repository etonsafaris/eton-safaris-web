import { withPgRetry } from '@/lib/pg-retry';
import { withPgClient } from '@/lib/supabase/pool';
import type { RecordRow } from '@/lib/types';

export const KEYWORD_TABLE_CANDIDATES = ['keywords', 'keyword', 'seo_keywords'] as const;

function isMissingRelation(message: string) {
  return /relation .* does not exist|undefined table/i.test(message);
}

/** Load all keyword rows from the first matching table in Aiven. */
export async function loadKeywordRows(): Promise<{ rows: RecordRow[]; table: string }> {
  return withPgRetry(async () =>
    withPgClient(async (client) => {
      let lastError: unknown;
      for (const name of KEYWORD_TABLE_CANDIDATES) {
        try {
          const result = await client.query(`SELECT * FROM "${name}" ORDER BY id DESC NULLS LAST`);
          return { rows: result.rows as RecordRow[], table: name };
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error);
          if (isMissingRelation(message)) continue;
          throw error;
        }
      }
      if (lastError) throw lastError;
      return { rows: [], table: 'keywords' };
    })
  );
}
