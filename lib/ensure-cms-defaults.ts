import { PUBLIC_SITE_LABELS } from '@/lib/collections';
import { landingConversionCopy } from '@/lib/landing-page-copy';
import { DEFAULT_CMS_PAGES, DEFAULT_LANDING_PAGES } from '@/lib/cms-defaults';
import { cmsPageFieldPack, inferPageLayout } from '@/lib/cms-page-model';
import { destinationPublicPath, matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { fetchCollectionRecords } from '@/lib/data';
import { embedContent } from '@/lib/embedded-content';
import { DEFAULT_HOME_PAGE_CONTENT, homePageFieldPack, HOME_PAGE_SLUG } from '@/lib/home-page-content';
import { defaultSeoValues } from '@/lib/seo';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';

function pagePayload(page: (typeof DEFAULT_CMS_PAGES)[number]) {
  const seo = defaultSeoValues('page');
  seo.slug = page.slug;
  seo.seo_title = page.seo_title;
  seo.meta_description = page.meta_description;
  seo.focus_keyphrase = page.focus_keyphrase;
  seo.focus_keywords = [page.focus_keyphrase, 'Eton Safaris', 'Uganda safari'];
  seo.schema_type = page.schema_type as typeof seo.schema_type;
  seo.breadcrumb_title = page.breadcrumb_title;
  seo.social_image_url = page.image_url;
  seo.og_title = page.seo_title;
  seo.og_description = page.meta_description;

  const extras = cmsPageFieldPack({
    layout: page.layout || inferPageLayout(page.slug),
    hero_title: page.hero_title || page.title,
    subtitle: page.subtitle || '',
    excerpt: page.excerpt,
    video_url: page.video_url || '',
    destinations: page.destinations || [],
    faqs: page.faqs,
    status: 'published',
    cta_label: 'Get in Touch',
    cta_href: '/contact-us',
    published_at: new Date().toISOString(),
  });
  const homeFields =
    page.slug === HOME_PAGE_SLUG || page.layout === 'home' ? homePageFieldPack(DEFAULT_HOME_PAGE_CONTENT) : {};

  return buildSavePayload(
    'pages',
    {
      title: page.title,
      slug: page.slug,
      image_url: page.image_url,
      excerpt: page.excerpt,
      layout: extras.layout,
      hero_title: extras.hero_title,
      subtitle: extras.subtitle,
      video_url: extras.video_url || homeFields.video_url || '',
      destinations: extras.destinations,
      faqs: extras.faqs,
      status: 'published',
      page_blocks: JSON.stringify(page.blocks || []),
      published_at: extras.published_at,
      content: embedContent(page.content, {
        blocks: page.blocks || [],
        fields: { ...extras, ...homeFields },
      }),
    },
    { seo }
  );
}

function landingPayload(landing: (typeof DEFAULT_LANDING_PAGES)[number]) {
  const copy = landingConversionCopy(landing.slug, landing.country);
  const seo = defaultSeoValues('country');
  seo.slug = landing.slug;
  seo.seo_title = landing.seo_title;
  seo.meta_description = landing.meta_description;
  seo.focus_keyphrase = landing.focus_keyphrase;
  seo.focus_keywords = [
    landing.focus_keyphrase,
    `${landing.country} safari`,
    `${landing.country} gorilla trekking`,
    'Eton Safaris',
  ];
  seo.schema_type = 'TouristDestination';
  seo.breadcrumb_title = landing.country;
  seo.social_image_url = landing.image_url;
  seo.og_title = landing.seo_title;
  seo.og_description = landing.meta_description;
  seo.canonical_url = `https://etonsafaris.com${destinationPublicPath(landing.slug)}`;

  const stamp = new Date().toISOString();
  const headline = landing.headline || copy.h1;
  return buildSavePayload(
    'landing_pages',
    {
      title: landing.title || headline,
      slug: landing.slug,
      country: landing.country,
      image_url: landing.image_url,
      excerpt: landing.excerpt || copy.seoIntro,
      headline,
      hero_title: headline,
      offer_line: copy.offerLine,
      ready_heading: copy.readyHeading,
      cta_label: 'Request a Quote',
      cta_href: '/request-a-quote',
      faqs: JSON.stringify(landing.faqs.length ? landing.faqs : copy.faqs),
      status: 'published',
      published_at: stamp,
      content: embedContent(landing.content || copy.seoIntro, {
        fields: {
          headline,
          excerpt: landing.excerpt || copy.seoIntro,
          hero_title: headline,
          offer_line: copy.offerLine,
          ready_heading: copy.readyHeading,
          cta_label: 'Request a Quote',
          cta_href: '/request-a-quote',
          faqs: JSON.stringify(landing.faqs.length ? landing.faqs : copy.faqs),
          status: 'published',
          published_at: stamp,
        },
      }),
    },
    { seo }
  );
}

export async function ensureDefaultCmsPages() {
  const rows = await fetchCollectionRecords('pages');
  let created = 0;
  for (const page of DEFAULT_CMS_PAGES) {
    if (matchCmsRecord(rows, page.slug, pageAliases(page.slug))) continue;
    const result = await saveWithColumnFallback('pages', pagePayload(page));
    if (!result.error) created += 1;
    else console.error(`[CMS] Failed to seed page ${page.slug}:`, result.error);
  }
  return created;
}

export async function ensureDefaultLandingPages() {
  const rows = await fetchCollectionRecords('landing_pages');
  let created = 0;
  for (const landing of DEFAULT_LANDING_PAGES) {
    const aliases = [landing.country, landing.country.toLowerCase(), landing.slug.replace(/-safaris$/, '')];
    if (matchCmsRecord(rows, landing.slug, aliases)) continue;
    const result = await saveWithColumnFallback('landing_pages', landingPayload(landing));
    if (!result.error) created += 1;
    else console.error(`[CMS] Failed to seed landing ${landing.slug}:`, result.error);
  }
  return created;
}
