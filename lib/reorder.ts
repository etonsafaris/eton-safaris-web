/** Move an item within an array immutably. */
export function moveArrayItem<T>(items: T[], from: number, direction: -1 | 1): T[] {
  const to = from + direction;
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Keep the editing index pointed at the same card after a reorder. */
export function adjustEditingIndexAfterMove(
  editingIndex: number | null,
  from: number,
  direction: -1 | 1
): number | null {
  if (editingIndex === null) return null;
  const to = from + direction;
  if (to < 0) return editingIndex;
  if (editingIndex === from) return to;
  if (from < editingIndex && to >= editingIndex) return editingIndex - 1;
  if (from > editingIndex && to <= editingIndex) return editingIndex + 1;
  return editingIndex;
}
