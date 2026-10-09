import type { CmsContentBlock } from '@/lib/cms-page-model';

export const COMMUNITY_INITIATIVES: CmsContentBlock[] = [
  {
    title: 'Community-Based Tourism',
    description:
      '<p>We partner with local villages to create authentic cultural experiences where travellers engage with communities, learn traditional crafts, and participate in daily life — keeping tourism revenue in the community.</p>',
    image_url: '',
  },
  {
    title: 'Education Support',
    description:
      '<p>A portion of every safari booking goes toward supporting local schools in rural Uganda, Kenya, Tanzania, and Rwanda — funding supplies, infrastructure, and scholarships for children in safari-adjacent communities.</p>',
    image_url: '',
  },
  {
    title: 'Conservation Efforts',
    description:
      '<p>We support anti-poaching and habitat restoration. Guests can visit conservation centres and learn about wildlife protection firsthand.</p>',
    image_url: '',
  },
  {
    title: 'Local Employment',
    description:
      '<p>We hire locally — safari guides, camp staff, drivers, and translators — creating sustainable jobs and authentic local knowledge on every itinerary.</p>',
    image_url: '',
  },
];

export function mergeCommunityInitiativeBlocks(existing: CmsContentBlock[] = []): CmsContentBlock[] {
  const used = new Set<number>();
  return COMMUNITY_INITIATIVES.map((slot, index) => {
    const titleMatch = existing.findIndex(
      (block, itemIndex) =>
        !used.has(itemIndex) && block.title.trim().toLowerCase() === slot.title.toLowerCase()
    );
    const fallbackIndex =
      titleMatch >= 0 ? titleMatch : existing[index] && !used.has(index) ? index : -1;
    if (fallbackIndex >= 0) used.add(fallbackIndex);
    const match = fallbackIndex >= 0 ? existing[fallbackIndex] : undefined;
    return {
      title: match?.title?.trim() || slot.title,
      description: String(match?.description || '').trim() || slot.description,
      image_url: String(match?.image_url || '').trim(),
    };
  });
}
