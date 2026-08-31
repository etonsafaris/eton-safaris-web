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

export function parseKeywords(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    /* fall through */
  }
  return value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
}

const STAY_BOILERPLATE_PATTERNS = [
  / Guests planning a <a[^>]+>[\s\S]*?<\/a> often pair this stay with park activities arranged by Eton Safaris\./gi,
  / Travelers comparing [\s\S]*? often add this park into a broader itinerary with Eton Safaris\./gi,
  / often pair this stay with park activities arranged by Eton Safaris\./gi,
];

export function stripStayBoilerplate(html) {
  let next = String(html || '');
  for (const pattern of STAY_BOILERPLATE_PATTERNS) {
    next = next.replace(pattern, '.');
  }
  return next
    .replace(/\.\./g, '.')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/\s+\./g, '.')
    .trim();
}

export function hasStayBoilerplate(html) {
  const text = String(html || '');
  return STAY_BOILERPLATE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

export function paragraphWithOneLink(text, phrases, tourLinks, index) {
  const phrase = phrases[index % phrases.length];
  const tour = tourLinks[index % Math.max(tourLinks.length, 1)];
  let html = `<p>${text}`;
  if (phrase && tour?.slug) {
    html += ` Eton Safaris can include a <a href="/tours/${tour.slug}">${phrase}</a> when building your route.`;
  }
  html += `</p>`;
  return html;
}

export function placementCopy(placement, parkName) {
  if (placement === 'inside') {
    return `inside ${parkName}, so game drives and walks start close to your room`;
  }
  if (placement === 'edge') {
    return `on the edge of ${parkName}, balancing park access with a quieter overnight base`;
  }
  return `near ${parkName} in a practical gateway area for early park entries and flexible evenings`;
}

export function typeNoun(type) {
  if (/tented/i.test(type)) return 'tented camp';
  if (/hotel/i.test(type)) return 'hotel';
  if (/banda/i.test(type)) return 'banda stay';
  return 'lodge';
}

function descriptionTitleFor({ name, type, parkName }) {
  const lower = `${name} ${parkName} ${type}`.toLowerCase();
  if (/gorilla|bwindi|mgahinga/i.test(lower)) return 'Rainforest lodge for gorilla trekkers';
  if (/chimp|kibale/i.test(lower)) return 'Forest stay for chimpanzee tracking';
  if (/murchison|nile/i.test(lower)) return 'Nile-side safari lodge';
  if (/queen elizabeth|kazinga|ishasha/i.test(lower)) return 'Savannah lodge for wildlife drives';
  if (/kidepo/i.test(lower)) return 'Remote wilderness safari base';
  if (/rwenzori|elgon|mount/i.test(lower)) return 'Mountain foothills lodge';
  if (/lake mburo/i.test(lower)) return 'Compact park safari lodge';
  if (/semuliki/i.test(lower)) return 'Albertine Rift forest lodge';
  if (/tented/i.test(type)) return 'Safari tented camp';
  if (/hotel/i.test(type)) return 'Safari hotel base';
  if (/banda/i.test(type)) return 'Park banda stay';
  return 'Stay overview';
}

const CUSTOM_LEADS = {
  'bwindi forest lodge': (parkName) =>
    `Bwindi Forest Lodge sits on the rainforest edge at Buhoma, the main gateway to ${parkName}. It is a comfortable mid-range base for early gorilla briefing mornings, with warm meals, practical rooms, and short transfers to sector trailheads.`,
  'paraa safari lodge': (parkName) =>
    `Paraa Safari Lodge overlooks the Nile within ${parkName}, placing guests close to boat cruises, game drives on the north bank, and the dramatic Murchison Falls viewpoints.`,
  'mweya safari lodge': (parkName) =>
    `Mweya Safari Lodge occupies the Kazinga Channel peninsula in ${parkName}, famous for boat cruises, tree-climbing lions in Ishasha, and classic savannah game drives.`,
  'mahogany springs lodge': (parkName) =>
    `Mahogany Springs Lodge is a well-known luxury property near Buhoma in ${parkName}, offering spacious rooms, forest views, and a refined base for gorilla trekking days.`,
};

export function inferPlacement(location, parkName) {
  const text = String(location || '').toLowerCase();
  if (/^inside\b/.test(text)) return 'inside';
  if (/edge of|buhoma|nkuringo|ruhija|rushaga|gateway|near\b/.test(text)) return 'edge';
  return 'edge';
}

export function parkFromStay(stay) {
  const fromCol = String(stay.national_park_name || stay.national_park || '').trim();
  if (fromCol) return fromCol;
  const fromLoc = String(stay.location || '').match(/\bInside\s+(.+)$/i);
  if (fromLoc?.[1]) return fromLoc[1].trim();
  if (/bwindi/i.test(String(stay.location || ''))) return 'Bwindi Impenetrable National Park';
  if (/murchison/i.test(String(stay.location || ''))) return 'Murchison Falls National Park';
  if (/queen elizabeth/i.test(String(stay.location || ''))) return 'Queen Elizabeth National Park';
  return String(stay.location || stay.country || 'Uganda').trim();
}

export function buildCuratedStayContent({
  name,
  type,
  country,
  parkName,
  location,
  placement,
  phrases,
  tourLinks,
  seed = 0,
  catalogEntry = null,
}) {
  const noun = typeNoun(type);
  const where = placementCopy(placement, parkName);
  const custom = CUSTOM_LEADS[String(name || '').trim().toLowerCase()];
  const lead = custom
    ? custom(parkName)
    : catalogEntry
      ? `${name} is a verified ${String(type || 'lodge').toLowerCase()} positioned ${placementCopy(catalogEntry.placement || placement, parkName)}${catalogEntry.location_note ? ` (${catalogEntry.location_note})` : ''}. Guests choose it for reliable park access, clear meal rhythms, and a setting that matches ${parkName}.`
      : `${name} is a ${String(type || 'safari lodge').toLowerCase()} positioned ${where}. The stay is chosen for comfort after long park days, clear inclusions, and a setting that matches the pace of ${parkName}.`;

  const overview1 = paragraphWithOneLink(lead, phrases, tourLinks, seed);
  const overview2 = paragraphWithOneLink(
    `Rooms and public areas are arranged for rest, hot showers, and easy briefings with your guide. Eton Safaris confirms meal plans, laundry, Wi‑Fi limits, and packing advice for this ${noun} before you travel.`,
    phrases,
    tourLinks,
    seed + 1
  );

  const blocks = [
    {
      title: 'Rooms & Comfort',
      description: paragraphWithOneLink(
        `Expect well kept rooms or tents with quality bedding, mosquito protection where needed, private or en suite bathrooms, and charging points for cameras. Luxury options lean into space and design; mid-range stays keep the essentials strong without clutter.`,
        phrases,
        tourLinks,
        seed + 2
      ),
    },
    {
      title: 'Dining & Daily Rhythm',
      description: paragraphWithOneLink(
        `Meals follow safari timing: early breakfasts before game drives or treks, packed lunches when useful, and hearty dinners after sundowners. Dietary needs can be noted at booking so the kitchen is ready when you arrive.`,
        phrases,
        tourLinks,
        seed + 3
      ),
    },
    {
      title: 'Location & Access',
      description: paragraphWithOneLink(
        `This property sits ${where}${location ? ` (${location})` : ''}. Transfers, airstrip links, and park gate timing are confirmed before travel so you waste fewer hours on the road and more hours in the field.`,
        phrases,
        tourLinks,
        seed + 4
      ),
    },
    {
      title: 'Who This Stay Suits',
      description: paragraphWithOneLink(
        `Ideal for travellers who want a clear ${String(type || 'lodge').toLowerCase()} experience near ${parkName} — couples, families with realistic pacing, and photographers who value early starts. Eton Safaris matches room category to your budget and trip style.`,
        phrases,
        tourLinks,
        seed + 5
      ),
    },
    {
      title: 'What Guests Appreciate Most',
      description: paragraphWithOneLink(
        `Guests value transparent inclusions, reliable park logistics, and a stay that answers the usual questions before arrival: how far to the gate, what meals are covered, how laundry works, and whether the ${noun} feels private after busy park days.`,
        phrases,
        tourLinks,
        seed + 6
      ),
    },
  ];

  return {
    description_title: descriptionTitleFor({ name, type, parkName }),
    description: `${overview1}\n${overview2}`,
    blocks,
  };
}

export function embedContent(html, blocks, fields) {
  return `${html}\n<!--ETON_CONTENT:${encodeURIComponent(JSON.stringify({ blocks, itineraries: [], fields }))}-->`;
}

export function parseEmbed(description) {
  const raw = String(description || '');
  const match = raw.match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  if (!match) {
    return { body: raw.trim(), fields: {}, blocks: [] };
  }
  try {
    const payload = JSON.parse(decodeURIComponent(match[1]));
    return {
      body: raw.replace(/<!--ETON_CONTENT:[\s\S]*?-->/, '').trim(),
      fields: payload.fields && typeof payload.fields === 'object' ? payload.fields : {},
      blocks: Array.isArray(payload.blocks) ? payload.blocks : [],
    };
  } catch {
    return { body: raw.replace(/<!--ETON_CONTENT:[\s\S]*?-->/, '').trim(), fields: {}, blocks: [] };
  }
}

export function needsContentCuration(stay, { force = false } = {}) {
  if (force) return true;
  if (hasStayBoilerplate(stay.description)) return true;
  const { blocks, body } = parseEmbed(stay.description);
  const plain = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = plain ? plain.split(/\s+/).length : 0;
  return blocks.length === 0 || words < 45;
}
