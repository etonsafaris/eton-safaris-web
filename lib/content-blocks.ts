/** CMS blocks are title + description only — no per-block images on admin or public site. */
export type TextContentBlock = {
  title: string;
  description: string;
};

export function blocksWithoutMedia<T extends { title?: string; description?: string }>(
  blocks: T[]
): TextContentBlock[] {
  return blocks.map((block) => ({
    title: String(block.title || ''),
    description: String(block.description || ''),
  }));
}
