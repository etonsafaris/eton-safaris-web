const DETAIL_KEYS = [
  'title',
  'name',
  'slug',
  'country',
  'status',
  'duration_days',
  'price',
  'location',
  'category',
  'tour',
  'guest_name',
  'email',
  'author',
  'headline',
  'tagline',
  'keywords',
] as const;

function asText(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function adminItemSummary(item: Record<string, unknown>) {
  const lines: string[] = [];
  for (const key of DETAIL_KEYS) {
    const value = asText(item[key]);
    if (value) lines.push(`${key.replace(/_/g, ' ')}: ${value}`);
  }
  const title =
    asText(item.title) || asText(item.name) || asText(item.guest_name) || asText(item.slug) || 'Untitled item';
  return { title, lines };
}

export async function notifyAdminItemSaved(input: {
  module: string;
  action: 'created' | 'updated';
  item?: Record<string, unknown>;
}) {
  try {
    await fetch('/api/admin/item-saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: input.module,
        action: input.action,
        item: input.item || {},
      }),
    });
  } catch (error) {
    console.error('[Admin] Item email notify failed:', error);
  }
}
