/** Lean columns for `generateStaticParams` (slug discovery only — no body HTML). */
export const STATIC_PARAM_COLUMNS = {
  tours: 'id,slug,seo_slug,title,published,status,is_published',
  accommodations: 'id,slug,seo_slug,title,published,status,is_published',
  national_park: 'id,slug,seo_slug,title,published,status,is_published',
  countries: 'id,slug,seo_slug,name,title,published,status,is_published',
  safari_updates: 'id,slug,seo_slug,title,published,status,is_published,publish_date',
} as const;

export const PUBLIC_PAGE_REVALIDATE_SECONDS = 900;

export function staticBuildParamLimit() {
  const fromEnv = Number(process.env.BUILD_STATIC_PARAMS_LIMIT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.min(200, Math.floor(fromEnv));
  return 48;
}

/** Tiny neutral blur for LCP heroes (no extra network request). */
export const IMAGE_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==';
