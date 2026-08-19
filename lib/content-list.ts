/** Split CMS list fields (bullets, HTML lists, or newlines) into plain items. */
export function splitContentList(value?: string | null): string[] {
  if (!value || !value.trim()) return [];

  const listItems = [...value.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((match) =>
    match[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
  if (listItems.length > 0) return listItems.filter(Boolean);

  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split(/\n+|•/)
    .map((item) => item.replace(/^[\-\*\d\.\)\s]+/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
