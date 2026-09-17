/** Client-safe date formatting — do not import server/db modules from here. */

export function parsePublishDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value > 1e12 ? value : value * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || /^(null|undefined|—|-|n\/a|none)$/i.test(trimmed)) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (dateOnly) {
    return new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])));
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPublishedDateValue(value: unknown): string {
  const date = parsePublishDate(value);
  if (date) {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  if (typeof value === 'string' && /\d{4}/.test(value)) {
    return value.replace(/^published\s+/i, '').trim();
  }
  return '';
}

/** Always returns a real calendar date so Published never shows as inactive "—". */
export function activePublishedDate(value?: unknown): string {
  return formatPublishedDateValue(value) || formatPublishedDateValue(new Date());
}

export function formatPublishedStamp(value: unknown): string {
  const pretty = formatPublishedDateValue(value);
  return pretty ? `Published ${pretty}` : '';
}
