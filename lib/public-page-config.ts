/**
 * Public pages use short ISR so Google and visitors get a fast first byte,
 * while CMS edits still appear within two minutes.
 */
export const revalidate = 120;
export const dynamic = 'auto';
export const fetchCache = 'default';
