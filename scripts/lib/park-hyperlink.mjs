/**
 * Shared park hyperlink helpers for country/category HTML.
 */

export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function stripEmbed(html) {
  return String(html || '').replace(/<!--ETON_CONTENT:[\s\S]*?-->/g, '').trim();
}

export function extractEmbed(html) {
  const match = String(html || '').match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  return match ? `<!--ETON_CONTENT:${match[1]}-->` : '';
}

export function plainText(html) {
  return stripEmbed(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clip(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

/** Extra aliases so user prose like "Bwindi Impenetrable Forest" still links. */
export const PARK_ALIASES = {
  'Bwindi Impenetrable National Park': [
    'Bwindi Impenetrable Forest National Park',
    'Bwindi Impenetrable Forest',
    'Bwindi Impenetrable',
    'Bwindi Forest',
    'Bwindi',
  ],
  'Mgahinga Gorilla National Park': ['Mgahinga National Park', 'Mgahinga Gorilla Park', 'Mgahinga'],
  'Queen Elizabeth National Park': ['Queen Elizabeth Park', 'Queen Elizabeth'],
  'Murchison Falls National Park': ['Murchison Falls Park', 'Murchison Falls'],
  'Kibale National Park': ['Kibale Forest National Park', 'Kibale Forest', 'Kibale'],
  'Lake Mburo National Park': ['Lake Mburo'],
  'Kidepo Valley National Park': ['Kidepo Valley', 'Kidepo'],
  'Masai Mara National Reserve': ['Maasai Mara National Reserve', 'Masai Mara Reserve', 'Maasai Mara', 'Masai Mara'],
  'Amboseli National Park': ['Amboseli'],
  'Tsavo East National Park': ['Tsavo East'],
  'Tsavo West National Park': ['Tsavo West'],
  'Samburu National Reserve': ['Samburu'],
  'Lake Nakuru National Park': ['Lake Nakuru'],
  'Nairobi National Park': ['Nairobi Park'],
  'Serengeti National Park': ['the Serengeti', 'Serengeti'],
  'Ngorongoro Conservation Area': ['Ngorongoro Crater', 'Ngorongoro'],
  'Tarangire National Park': ['Tarangire'],
  'Lake Manyara National Park': ['Lake Manyara'],
  'Ruaha National Park': ['Ruaha'],
  'Nyerere National Park': ['Nyerere', 'Selous'],
  'Kilimanjaro National Park': ['Mount Kilimanjaro', 'Kilimanjaro'],
  'Volcanoes National Park': ['Volcanoes National park', 'Volcanoes Park'],
  'Akagera National Park': ['Akagera'],
  'Nyungwe National Park': ['Nyungwe Forest National Park', 'Nyungwe Forest', 'Nyungwe'],
  'Chobe National Park': ['Chobe'],
  'Moremi Game Reserve': ['Moremi'],
  'Central Kalahari Game Reserve': ['Central Kalahari', 'Kalahari Game Reserve'],
  'Etosha National Park': ['Etosha'],
  'Namib Naukluft National Park': ['Namib-Naukluft National Park', 'Namib Naukluft', 'Sossusvlei'],
  'Skeleton Coast National Park': ['Skeleton Coast'],
  'South Luangwa National Park': ['South Luangwa'],
  'Lower Zambezi National Park': ['Lower Zambezi'],
  'Kafue National Park': ['Kafue'],
  'Hwange National Park': ['Hwange'],
  'Mana Pools National Park': ['Mana Pools'],
  'Matobo National Park': ['Matobo Hills', 'Matobo'],
  'Victoria Falls National Park': ['Victoria Falls'],
  'Kruger National Park': ['Kruger'],
  'Addo Elephant National Park': ['Addo Elephant Park', 'Addo'],
  'Pilanesberg National Park': ['Pilanesberg'],
  'Table Mountain National Park': ['Table Mountain'],
  'Virunga National Park': ['Virunga'],
  'Kahuzi Biega National Park': ['Kahuzi-Biega National Park', 'Kahuzi Biega'],
  'Simien Mountains National Park': ['Simien Mountains', 'Simiens'],
  'Bale Mountains National Park': ['Bale Mountains'],
  'Awash National Park': ['Awash'],
  'Liwonde National Park': ['Liwonde'],
  'Nyika National Park': ['Nyika'],
  'Majete Wildlife Reserve': ['Majete'],
  'Gorongosa National Park': ['Gorongosa'],
  'Bazaruto Archipelago National Park': ['Bazaruto Archipelago', 'Bazaruto'],
  'Maputo Special Reserve': ['Maputo Reserve'],
  'Andasibe Mantadia National Park': ['Andasibe-Mantadia National Park', 'Andasibe Mantadia', 'Andasibe'],
  'Isalo National Park': ['Isalo'],
  'Ranomafana National Park': ['Ranomafana'],
  'Morne Seychellois National Park': ['Morne Seychellois'],
  'Vallée de Mai Nature Reserve': ['Vallee de Mai Nature Reserve', 'Vallée de Mai', 'Vallee de Mai'],
  'Curieuse Marine National Park': ['Curieuse'],
  'Ras Mohammed National Park': ['Ras Mohammed'],
  'White Desert National Park': ['White Desert'],
  'Wadi El Rayan Protected Area': ['Wadi El Rayan'],
  'Toubkal National Park': ['Toubkal', 'Mount Toubkal'],
  'Ifrane National Park': ['Ifrane'],
  'Souss Massa National Park': ['Souss Massa'],
  'Mount Elgon National Park': ['Mount Elgon', 'Mt Elgon'],
  'Rwenzori Mountains National Park': ['Rwenzori Mountains', 'Rwenzoris', 'Mountains of the Moon'],
  'Semuliki National Park': ['Semuliki', 'Semliki'],
  'Aberdare National Park': ['Aberdares', 'Aberdare'],
  "Hell's Gate National Park": ['Hells Gate National Park', "Hell's Gate", 'Hells Gate'],
  'Mount Kenya National Park': ['Mount Kenya', 'Mt Kenya'],
  'Meru National Park': ['Meru'],
  'Arusha National Park': ['Arusha Park'],
  'Mikumi National Park': ['Mikumi'],
  'Katavi National Park': ['Katavi'],
  'Mahale Mountains National Park': ['Mahale Mountains', 'Mahale'],
  'Gombe Stream National Park': ['Gombe Stream', 'Gombe'],
  'Gishwati-Mukura National Park': ['Gishwati-Mukura', 'Gishwati Mukura', 'Gishwati'],
  'Makgadikgadi Pans National Park': ['Makgadikgadi Pans', 'Makgadikgadi'],
  'Nxai Pan National Park': ['Nxai Pan'],
  'North Luangwa National Park': ['North Luangwa'],
  'Liuwa Plain National Park': ['Liuwa Plain', 'Liuwa'],
  'Mosi-oa-Tunya National Park': ['Mosi-oa-Tunya', 'Mosi oa Tunya'],
  'Gonarezhou National Park': ['Gonarezhou'],
  'Matusadona National Park': ['Matusadona'],
  'Garden Route National Park': ['Garden Route'],
  'Kgalagadi Transfrontier Park': ['Kgalagadi'],
  'Garamba National Park': ['Garamba'],
  'Salonga National Park': ['Salonga'],
  'Nechisar National Park': ['Nech Sar National Park', 'Nechisar', 'Nech Sar'],
  'Lake Malawi National Park': ['Lake Malawi'],
  'Limpopo National Park': ['Limpopo'],
  'Quirimbas National Park': ['Quirimbas'],
  'Tsingy de Bemaraha National Park': ['Tsingy de Bemaraha', 'Bemaraha'],
  'Ankarana National Park': ['Ankarana'],
  'Masoala National Park': ['Masoala'],
};

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build phrase → /parks/slug map for a country, longest phrases first.
 * @param {{ name: string, seo_slug?: string }[]} parks
 */
export function buildParkLinkTargets(parks) {
  /** @type {{ phrase: string, href: string }[]} */
  const targets = [];
  for (const park of parks) {
    const name = String(park.name || '').trim();
    if (!name) continue;
    const slug = slugify(park.seo_slug || name);
    const href = `/parks/${slug}`;
    const aliases = PARK_ALIASES[name] || [];
    const phrases = [name, ...aliases];
    for (const phrase of phrases) {
      if (!phrase || phrase.length < 4) continue;
      targets.push({ phrase, href });
    }
  }
  targets.sort((a, b) => b.phrase.length - a.phrase.length);
  // Deduplicate identical phrases (keep first = longest already sorted within same length)
  const seen = new Set();
  return targets.filter((item) => {
    const key = item.phrase.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Wrap park name mentions with /parks links. Skips text already inside <a>.
 * Re-applies cleanly by unwrapping prior /parks links first (longest phrase wins).
 */
export function hyperlinkParksInHtml(html, parks) {
  const embed = extractEmbed(html);
  let body = stripEmbed(html);
  if (!body.trim()) return html;
  const targets = buildParkLinkTargets(parks);
  if (!targets.length) return html;

  // Unwrap previous park links so longer aliases can win on re-runs
  body = body.replace(/<a\b[^>]*href=["']\/parks\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/gi, '$1');

  // Protect remaining non-park anchors
  const anchors = [];
  body = body.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (match) => {
    const token = `__ETON_A_${anchors.length}__`;
    anchors.push(match);
    return token;
  });

  for (const { phrase, href } of targets) {
    const flexible = escapeRegExp(phrase).split(/\s+/).join('\\s+');
    const pattern = new RegExp(`(?<![\\w/])(${flexible})(?![\\w])`, 'gi');
    body = body.replace(pattern, (match) => `<a href="${href}">${match}</a>`);
  }

  body = body.replace(/__ETON_A_(\d+)__/g, (_, idx) => anchors[Number(idx)] || '');
  return embed ? `${body}\n${embed}` : body;
}

export function withEmbed(html, existingHtml) {
  const embed = extractEmbed(existingHtml);
  const body = stripEmbed(html);
  if (embed) return `${body}\n${embed}`;
  const stamp = new Date().toISOString();
  const payload = { blocks: [], itineraries: [], fields: { faqs: '[]', published_at: stamp } };
  return `${body}\n<!--ETON_CONTENT:${encodeURIComponent(JSON.stringify(payload))}-->`;
}

const PARKS_DIR_RE =
  /<p>\s*<b>\s*National Parks in [^<]+<\/b>\s*<\/p>\s*(?:<p>[\s\S]*?<\/p>\s*)*/i;

/** Remove a previously appended National Parks directory block. */
export function stripParksDirectory(html) {
  const embed = extractEmbed(html);
  let body = stripEmbed(html).replace(PARKS_DIR_RE, '').trim();
  return embed ? `${body}\n${embed}` : body;
}

/**
 * Append a linked directory of every park for the country so country pages talk about them all.
 */
export function appendParksDirectory(html, countryName, parks) {
  const cleaned = stripParksDirectory(html);
  const embed = extractEmbed(cleaned);
  let body = stripEmbed(cleaned).trim();
  if (!parks.length) return cleaned;

  const items = parks
    .map((park) => {
      const name = String(park.name || '').trim();
      if (!name) return '';
      const slug = slugify(park.seo_slug || name);
      const hook = String(park.hook || '')
        .replace(/^a\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      const clause = hook ? ` — ${hook}` : '';
      return `<p><a href="/parks/${slug}">${name}</a>${clause}.</p>`;
    })
    .filter(Boolean)
    .join('\n');

  const section = `<p><b>National Parks in ${countryName}</b></p>
<p>Eton Safaris features every national park and key protected area listed for ${countryName} on this site. Open any park below for wildlife, how to visit, packing, and health guidance.</p>
${items}`;

  body = `${body}\n${section}`;
  return embed ? `${body}\n${embed}` : body;
}
