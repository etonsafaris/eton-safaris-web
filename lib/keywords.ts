import { parseFocusKeywords } from '@/lib/seo';
import { pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

function asRecord(row: RecordRow | Record<string, unknown>): Record<string, unknown> {
  return row as Record<string, unknown>;
}

export function parseKeywordList(value: unknown): string[] {
  return parseFocusKeywords(value);
}

export function uniqueKeywords(values: string[]): string[] {
  const chips: string[] = [];
  for (const value of values) {
    const keyword = value.trim();
    if (!keyword) continue;
    if (!chips.some((chip) => chip.toLowerCase() === keyword.toLowerCase())) {
      chips.push(keyword);
    }
  }
  return chips;
}

export type SavedKeywordSet = {
  key: string;
  rowId: string;
  rowIds: string[];
  country: string;
  category: string;
  keywords: string[];
};

export function savedKeywordSets(rows: Array<RecordRow | Record<string, unknown>>): SavedKeywordSet[] {
  const groups = new Map<string, SavedKeywordSet>();

  for (const row of rows) {
    const data = asRecord(row);
    const country = pickString(data as RecordRow, ['country']);
    const category = pickString(data as RecordRow, ['category']);
    if (!category) continue;
    const scope = `${country.toLowerCase()}::${category.toLowerCase()}`;
    const current = groups.get(scope) || {
      key: scope,
      rowId: '',
      rowIds: [],
      country,
      category,
      keywords: [],
    };
    const id = String(data.id || '').trim();
    if (id && !current.rowIds.includes(id)) current.rowIds.push(id);
    if (!current.rowId && id) current.rowId = id;
    current.keywords = uniqueKeywords([
      ...current.keywords,
      ...parseKeywordList(data.keywords ?? data.keyword ?? data.title),
    ]);
    groups.set(scope, current);
  }

  return Array.from(groups.values());
}

function normalizeScopeToken(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function keywordRowMatchesScope(
  row: RecordRow | Record<string, unknown>,
  country: string,
  category: string
): boolean {
  const data = asRecord(row);
  const rowCountry = normalizeScopeToken(String(data.country || ''));
  const rowCategory = normalizeScopeToken(String(data.category || ''));
  const targetCountry = normalizeScopeToken(country);
  const targetCategory = normalizeScopeToken(category);
  if (!targetCategory) return false;
  const matchesCountry =
    !rowCountry || !targetCountry || rowCountry === targetCountry || rowCountry.includes(targetCountry);
  const matchesCategory =
    rowCategory === targetCategory ||
    rowCategory.includes(targetCategory) ||
    targetCategory.includes(rowCategory);
  return matchesCountry && matchesCategory;
}

export function chipsFromKeywordRows(rows: Array<RecordRow | Record<string, unknown>>): string[] {
  const chips: string[] = [];
  for (const row of rows) {
    const data = asRecord(row);
    const values = parseKeywordList(data.keywords ?? data.keyword ?? data.title ?? data.name);
    for (const value of values) {
      if (!chips.some((chip) => chip.toLowerCase() === value.toLowerCase())) {
        chips.push(value);
      }
    }
  }
  return chips;
}
