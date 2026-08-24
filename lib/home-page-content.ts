import { SITE } from '@/lib/collections';
import { parseCmsBlocks, parseCmsPageExtras, type CmsContentBlock } from '@/lib/cms-page-model';
import { extractEmbeddedContent } from '@/lib/embedded-content';
import { pickString } from '@/lib/data';
import { SITE_MEDIA } from '@/lib/site-media';
import type { RecordRow } from '@/lib/types';

export type HomeFeaturePoint = {
  title: string;
  description: string;
};

export type HomePageContent = {
  brandTitle: string;
  brandDescription: string;
  setsApartHeading: string;
  setsApartIntro: string;
  features: HomeFeaturePoint[];
  videos: string[];
  footerAbout: string;
};

export const DEFAULT_HOME_FEATURES: HomeFeaturePoint[] = [
  {
    title: 'Personalized Safari Journeys',
    description:
      'Share your travel dreams with us, and we will create a carefully tailored safari experience designed around your interests, schedule, and expectations.',
  },
  {
    title: 'Remarkable Safari Experiences',
    description:
      'Discover thoughtfully designed journeys, expert local knowledge, hidden safari gems, and carefully selected experiences that make every trip truly memorable.',
  },
  {
    title: 'Safety, Comfort & Trust',
    description:
      'Travel with confidence knowing that your safety, privacy, comfort, and overall experience are carefully considered throughout your journey across Africa.',
  },
  {
    title: 'Experienced Local Experts',
    description:
      'Travel alongside knowledgeable guides and dedicated local professionals who bring Africa to life through their expertise, warm hospitality, and genuine passion for unforgettable adventures.',
  },
];

export const DEFAULT_HOME_PAGE_CONTENT: HomePageContent = {
  brandTitle: 'ETON SAFARIS',
  brandDescription: SITE.about,
  setsApartHeading: 'What Sets Us Apart',
  setsApartIntro:
    'Our passionate and experienced African team combines local knowledge, professional expertise, and genuine hospitality to create meaningful journeys filled with discovery, comfort, and unforgettable memories.',
  features: DEFAULT_HOME_FEATURES,
  videos: [],
  footerAbout:
    'Eton Safaris is a premier tours and travel agency based in Uganda, offering gorilla trekking, wildlife safaris, and cultural experiences across Africa. Tailor-made luxury expeditions for every clientele.',
};

export const HOME_PAGE_SLUG = 'home-page';

/** Old hard-coded demo clips — never show these on the public home video section. */
const LEGACY_HOME_VIDEO_URLS = new Set(
  [SITE_MEDIA.gorillaVideo, SITE_MEDIA.gorillaVideoFallback].filter(Boolean)
);

function isLegacyHomeVideo(url: string) {
  const value = String(url || '').trim();
  if (!value) return true;
  if (LEGACY_HOME_VIDEO_URLS.has(value)) return true;
  return /videos\.pexels\.com/i.test(value);
}

function parseVideoList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter((item) => item && !isLegacyHomeVideo(item));
  }
  if (typeof value === 'string' && value.trim()) {
    const raw = value.trim();
    if (raw.startsWith('[')) {
      try {
        return parseVideoList(JSON.parse(raw));
      } catch {
        // fall through
      }
    }
    return raw
      .split(/[\n,|]+/)
      .map((item) => item.trim())
      .filter((item) => item && !isLegacyHomeVideo(item));
  }
  return [];
}

function featuresFromBlocks(blocks: CmsContentBlock[]): HomeFeaturePoint[] {
  const mapped = blocks
    .map((block) => ({
      title: String(block.title || '').trim(),
      description: String(block.description || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    }))
    .filter((item) => item.title || item.description);
  if (!mapped.length) return DEFAULT_HOME_FEATURES.map((item) => ({ ...item }));
  return DEFAULT_HOME_FEATURES.map((fallback, index) => ({
    title: mapped[index]?.title || fallback.title,
    description: mapped[index]?.description || fallback.description,
  }));
}

export function homeFeatureBlocks(features: HomeFeaturePoint[]): CmsContentBlock[] {
  return features.map((feature) => ({
    title: feature.title.trim(),
    description: feature.description.trim() ? `<p>${feature.description.trim()}</p>` : '',
  }));
}

export function parseHomePageContent(record: RecordRow | null | undefined): HomePageContent {
  const extras = parseCmsPageExtras(record, HOME_PAGE_SLUG);
  const embedded = extractEmbeddedContent(
    pickString(record || {}, ['content', 'description', 'body', 'summary', 'excerpt'])
  );
  const fields = embedded.fields || {};
  const videos = parseVideoList(
    fields.home_videos || record?.home_videos || fields.video_url || extras.video_url || record?.video_url
  );
  const brandTitle =
    pickString(record || {}, ['brand_title', 'hero_title'], fields.brand_title || extras.hero_title) ||
    DEFAULT_HOME_PAGE_CONTENT.brandTitle;
  const brandDescription =
    pickString(
      record || {},
      ['brand_description', 'excerpt'],
      fields.brand_description || extras.excerpt || extras.subtitle
    ) || DEFAULT_HOME_PAGE_CONTENT.brandDescription;
  const setsApartHeading =
    pickString(record || {}, ['sets_apart_heading'], fields.sets_apart_heading) ||
    DEFAULT_HOME_PAGE_CONTENT.setsApartHeading;
  const setsApartIntro =
    pickString(record || {}, ['sets_apart_intro', 'subtitle'], fields.sets_apart_intro) ||
    DEFAULT_HOME_PAGE_CONTENT.setsApartIntro;
  const footerAbout =
    pickString(record || {}, ['footer_about'], fields.footer_about) ||
    DEFAULT_HOME_PAGE_CONTENT.footerAbout;

  return {
    brandTitle: brandTitle.toUpperCase(),
    brandDescription,
    setsApartHeading,
    setsApartIntro,
    features: featuresFromBlocks(parseCmsBlocks(record)),
    videos,
    footerAbout,
  };
}

export function homePageFieldPack(content: HomePageContent): Record<string, string> {
  return {
    layout: 'home',
    hero_title: content.brandTitle,
    brand_title: content.brandTitle,
    brand_description: content.brandDescription,
    excerpt: content.brandDescription.slice(0, 280),
    subtitle: content.setsApartIntro,
    sets_apart_heading: content.setsApartHeading,
    sets_apart_intro: content.setsApartIntro,
    footer_about: content.footerAbout,
    home_videos: JSON.stringify(content.videos.filter(Boolean)),
    video_url: content.videos[0] || '',
    status: 'published',
  };
}
