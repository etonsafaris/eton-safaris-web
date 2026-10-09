/** CMS blocks are title + description. Page story blocks may also keep an uploaded image. */
export type TextContentBlock = {
  title: string;
  description: string;
  image_url?: string;
};

export function blocksWithoutMedia<T extends { title?: string; description?: string; image_url?: string }>(
  blocks: T[],
  options?: { keepImages?: boolean }
): TextContentBlock[] {
  return blocks.map((block) => {
    const image = String(block.image_url || '').trim();
    return {
      title: String(block.title || ''),
      description: String(block.description || ''),
      ...(options?.keepImages && image && !image.startsWith('blob:') ? { image_url: image } : {}),
    };
  });
}
