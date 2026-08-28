/**
 * Curated royalty-free photos (Unsplash + Pexels) — verified 200 responses, no watermarks.
 */
const UNSPLASH = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=78&fm=webp`;

const PEXELS = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`;

export const TOUR_IMAGE_THEMES = {
  gorilla: [
    UNSPLASH('photo-1526336024174-e58f5cdd8e13'),
    UNSPLASH('photo-1578662996442-48f60103fc96'),
    UNSPLASH('photo-1535083783855-76ae62b2914e'),
    PEXELS('247376'),
    PEXELS('145939'),
    UNSPLASH('photo-1518791841217-8f162f1e1131'),
    UNSPLASH('photo-1554151228-14d9def656e4'),
    UNSPLASH('photo-1540573133985-87b6da6d54a9'),
  ],
  chimp: [
    UNSPLASH('photo-1540573133985-87b6da6d54a9'),
    UNSPLASH('photo-1535083783855-76ae62b2914e'),
    UNSPLASH('photo-1549366021-9f761d450615'),
    PEXELS('247376'),
    UNSPLASH('photo-1564760055775-d63b17a55c44'),
    UNSPLASH('photo-1547471080-7cc2caa01a7e'),
  ],
  wildlife: [
    UNSPLASH('photo-1547471080-7cc2caa01a7e'),
    UNSPLASH('photo-1564760055775-d63b17a55c44'),
    UNSPLASH('photo-1489392191049-fc10c97e64b6'),
    UNSPLASH('photo-1551632811-561732d1e306'),
    UNSPLASH('photo-1549366021-9f761d450615'),
    UNSPLASH('photo-1583337130417-3346a1be7dee'),
    PEXELS('45778'),
    PEXELS('247376'),
    PEXELS('145939'),
    PEXELS('1032650'),
    PEXELS('1450360'),
    PEXELS('1179229'),
    PEXELS('247599'),
    UNSPLASH('photo-1500530855697-b586d89ba3ee'),
    UNSPLASH('photo-1470071459604-3b5ec3a7fe05'),
    UNSPLASH('photo-1559827260-dc66d52bef19'),
    UNSPLASH('photo-1506905925346-21bda4d32df4'),
    UNSPLASH('photo-1469474968028-56623f02e42e'),
    UNSPLASH('photo-1519681393784-d120267933ba'),
    UNSPLASH('photo-1544551763-46a013bb70d5'),
  ],
  beach: [
    UNSPLASH('photo-1507525428034-b723cf961d3e'),
    UNSPLASH('photo-1439066615861-d1af74d74000'),
    UNSPLASH('photo-1559827260-dc66d52bef19'),
    UNSPLASH('photo-1544551763-46a013bb70d5'),
    PEXELS('1032650'),
    PEXELS('1450360'),
    PEXELS('1179229'),
    PEXELS('247599'),
    UNSPLASH('photo-1470071459604-3b5ec3a7fe05'),
    UNSPLASH('photo-1506905925346-21bda4d32df4'),
    UNSPLASH('photo-1469474968028-56623f02e42e'),
    UNSPLASH('photo-1500530855697-b586d89ba3ee'),
  ],
  mountain: [
    UNSPLASH('photo-1464822759023-fed622ff2c3b'),
    UNSPLASH('photo-1519681393784-d120267933ba'),
    UNSPLASH('photo-1506905925346-21bda4d32df4'),
    UNSPLASH('photo-1469474968028-56623f02e42e'),
    UNSPLASH('photo-1500530855697-b586d89ba3ee'),
    UNSPLASH('photo-1470071459604-3b5ec3a7fe05'),
    PEXELS('45778'),
    UNSPLASH('photo-1551632811-561732d1e306'),
  ],
  birding: [
    UNSPLASH('photo-1444464666168-49d633b86797'),
    UNSPLASH('photo-1547471080-7cc2caa01a7e'),
    UNSPLASH('photo-1470071459604-3b5ec3a7fe05'),
    UNSPLASH('photo-1500530855697-b586d89ba3ee'),
    UNSPLASH('photo-1564760055775-d63b17a55c44'),
    PEXELS('145939'),
    PEXELS('247376'),
  ],
  culture: [
    UNSPLASH('photo-1489392191049-fc10c97e64b6'),
    UNSPLASH('photo-1551632811-561732d1e306'),
    UNSPLASH('photo-1500530855697-b586d89ba3ee'),
    UNSPLASH('photo-1469474968028-56623f02e42e'),
    UNSPLASH('photo-1506905925346-21bda4d32df4'),
    PEXELS('247599'),
    PEXELS('1179229'),
  ],
  desert: [
    UNSPLASH('photo-1500530855697-b586d89ba3ee'),
    UNSPLASH('photo-1469474968028-56623f02e42e'),
    UNSPLASH('photo-1506905925346-21bda4d32df4'),
    UNSPLASH('photo-1519681393784-d120267933ba'),
    UNSPLASH('photo-1489392191049-fc10c97e64b6'),
    PEXELS('45778'),
    PEXELS('247599'),
    PEXELS('1450360'),
  ],
};

export function themeForTour({ category = '', title = '', country = '' }) {
  const cat = String(category || '').toLowerCase();
  const text = `${category} ${title} ${country}`.toLowerCase();
  if (/gorilla/i.test(text)) return 'gorilla';
  if (/chimp/i.test(text)) return 'chimp';
  if (/\bbeach\b|coastal|coastline|seashore|zanzibar|seychelles/i.test(cat) || /\bbeach holiday\b/i.test(text)) {
    return 'beach';
  }
  if (/climb|mountain|kilimanjaro|meru|rwenzori|\bhike\b|trekking/i.test(text) && !/gorilla/i.test(text)) {
    return 'mountain';
  }
  if (/bird/i.test(text)) return 'birding';
  if (/egypt|morocco|sahara|desert|oasis|pyramid|cairo/i.test(text)) return 'desert';
  if (/culture|community|heritage/i.test(text)) return 'culture';
  if (/wildlife|safari|game|national park/i.test(text)) return 'wildlife';
  return 'wildlife';
}

export function curatedUrlsForTheme(theme, count = 20) {
  const pool = TOUR_IMAGE_THEMES[theme] || TOUR_IMAGE_THEMES.wildlife;
  const urls = [];
  for (let i = 0; i < count; i += 1) {
    urls.push(pool[i % pool.length]);
  }
  return urls;
}

/** Heuristic: URLs or tiny files that often carry watermarks or stock overlays. */
export function imageLooksRisky(url) {
  const value = String(url || '').toLowerCase();
  if (!value) return true;
  return /logo|watermark|stamp|shutterstock|getty|istock|alamy|dreamstime|depositphotos|123rf|bigstock|brand|badge|icon|sprite|canva|tourradar|viator|tripadvisor|safaribookings|agoda|booking\.com/i.test(
    value
  );
}
