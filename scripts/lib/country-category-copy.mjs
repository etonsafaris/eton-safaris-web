/**
 * Curated country & category HTML — Uganda reference format:
 * bold title + intro paragraph + flagship parks paragraph (names hyperlinked by curate script).
 */
import { PARKS_BY_COUNTRY } from './national-parks-catalog.mjs';

function parkList(country) {
  return (PARKS_BY_COUNTRY[country] || []).map((p) => p.name);
}

function joinParks(names) {
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function countryShell(title, p1, p2) {
  return `<p><b>${title}</b></p>
<p>${p1}</p>
<p>${p2}</p>`;
}

/** Second paragraph naming flagship parks (Uganda-style). */
function flagshipParksParagraph(country, parks) {
  const entries = (parks || []).slice(0, 6);
  if (!entries.length) {
    return `Eton Safaris times transfers, permits, and lodge bases so wildlife days across ${country} stay focused rather than rushed.`;
  }

  const highlights = entries.slice(0, 4).map((park) => {
    const activity =
      String(park.experiences || '')
        .split(',')[0]
        .trim() ||
      String(park.hook || '')
        .replace(/^a\s+/i, '')
        .replace(/^an\s+/i, '')
        .trim();
    const label = activity.length > 8 && activity.length < 90 ? activity : `wildlife and scenery`;
    return `${label} in ${park.name}`;
  });

  const also = entries.length > 4 ? joinParks(entries.slice(4).map((p) => p.name)) : '';
  const alsoClause = also ? ` Further highlights include ${also}.` : '';

  return `${country} rewards travellers who move beyond a single park. Signature experiences include ${joinParks(
    highlights.slice(0, 2).map((h) => h.replace(/^(.+ in .+)$/, '$1'))
  )}${highlights.length > 2 ? `, plus ${highlights.slice(2).join(', ')}` : ''}.${alsoClause} Eton Safaris times transfers, permits, and lodge bases so trekking and wildlife days stay focused rather than rushed.`;
}

function buildFromIntro(country, title, intro, parks, customP2) {
  const p2 = customP2 || flagshipParksParagraph(country, parks);
  return countryShell(title, intro, p2);
}

/** @type {Record<string, { title: string, intro: string }>} */
const COUNTRY_INTROS = {
  Uganda: {
    title: 'Explore Uganda, Pearl of Africa',
    intro: `Experience Uganda safari tours through stunning landscapes, diverse wildlife, and rich cultural experiences. Nestled in East Africa, Uganda is renowned for gorilla trekking, making it a must-visit destination for nature lovers and adventure seekers.`,
    p2: `With over half the world's mountain gorillas, Uganda is Africa's premier gorilla trekking destination. Beyond gorillas in Bwindi Impenetrable National Park and Mgahinga Gorilla National Park, guests find lions and elephants in Queen Elizabeth National Park, the Nile at Murchison Falls National Park, and chimpanzees in Kibale National Park. Eton Safaris times transfers, permits, and lodge bases so wildlife days stay focused rather than rushed.`,
  },
  Kenya: {
    title: 'Explore Kenya Safari Tours',
    intro: `Kenya safari tours combine savannahs, lakelands, the Great Rift Valley, and Indian Ocean shoreline. Wildlife concentrates in classic reserves, including the Masai Mara for wildebeest migration season and Amboseli for elephants with views toward Kilimanjaro.`,
  },
  Tanzania: {
    title: 'Explore Tanzania Safari Tours',
    intro: `Tanzania safari tours take in three of Africa's great lakes, the plains of the Serengeti, and Kilimanjaro. The country also offers tropical islands, from Mafia's marine park to Zanzibar's spice-island beaches.`,
  },
  Rwanda: {
    title: 'Explore Rwanda, Land of a Thousand Hills',
    intro: `Rwanda's rolling hills, rainforest, and savanna support gorilla and golden monkey treks, chimpanzee tracking, and Big Five viewing. Kigali adds a thoughtful city start, with the genocide memorial as an important historical chapter.`,
  },
  Botswana: {
    title: 'Explore Botswana, Delta and Desert Safaris',
    intro: `Botswana is one of southern Africa's premier wilderness destinations, defined by the Okavango Delta, Kalahari sands, and low-volume, high-quality safari camps. Travellers come for mokoro channels, predator-rich plains, and some of the continent's most exclusive wildlife viewing.`,
  },
  Namibia: {
    title: 'Explore Namibia, Land of Contrasts',
    intro: `Namibia is defined by open horizons, desert light, and wildlife that concentrates around scarce water. Travellers come for dune landscapes, Atlantic wilderness, and classic game viewing across vast, lightly populated parks.`,
  },
  Zambia: {
    title: 'Explore Zambia, Home of the Walking Safari',
    intro: `Zambia is one of Africa's most authentic safari countries, known for walking safaris, river-focused game viewing, and camps that sit close to wilderness. Guests who value guiding quality and fewer crowds often place Zambia high on a southern Africa itinerary.`,
  },
  Zimbabwe: {
    title: 'Explore Zimbabwe, Falls and Wild Frontiers',
    intro: `Zimbabwe blends one of the world's great natural wonders with predator-rich parks and canoe country along the Zambezi. The country suits travellers who want classic game drives, walking where permitted, and time at the falls in a single well-paced route.`,
  },
  'South Africa': {
    title: 'Explore South Africa, Big Five and Beyond',
    intro: `South Africa combines reliable Big Five safari with city, coast, and wine country in one passport-friendly journey. It is an excellent first safari destination and a flexible add-on to East or Southern Africa circuits.`,
  },
  'DR Congo': {
    title: 'Explore DR Congo, Rainforest and Volcano Safaris',
    intro: `DR Congo offers some of Africa's most dramatic rainforest and volcano experiences, from mountain gorillas in Virunga to lowland gorillas in Kahuzi-Biega. Travel here rewards guests who want specialist guiding and carefully planned logistics.`,
  },
  Ethiopia: {
    title: 'Explore Ethiopia, Highlands and Ancient Landscapes',
    intro: `Ethiopia pairs highland trekking, endemic wildlife, and ancient cultural sites in one of Africa's most distinctive destinations. From Simien escarpments to Rift Valley lakes, the country suits adventurous travellers who want depth beyond classic savannah safari.`,
  },
  Malawi: {
    title: 'Explore Malawi, the Warm Heart of Africa',
    intro: `Malawi pairs freshwater lake holidays with recovering wildlife parks and warm hospitality. The country works well as a compact safari-and-lake holiday or a softer-paced southern Africa extension.`,
  },
  Mozambique: {
    title: 'Explore Mozambique, Safari Coast and Islands',
    intro: `Mozambique is a coastline-and-wilderness destination where savannah parks meet Indian Ocean islands. Guests often combine wildlife days with snorkelling, diving, and quiet beach lodges.`,
  },
  Madagascar: {
    title: 'Explore Madagascar, Lemurs and Unique Landscapes',
    intro: `Madagascar is unlike anywhere else in Africa, with endemic lemurs, baobab avenues, and rainforest parks that reward patient exploration. It suits travellers who want nature-first itineraries with strong guiding and realistic road or flight planning.`,
  },
  Seychelles: {
    title: 'Explore Seychelles, Island Nature Escapes',
    intro: `Seychelles is an Indian Ocean island destination of granite peaks, palm forests, and clear reefs. Nature time centres on national parks and marine reserves, ideal after an East African safari or as a standalone beach holiday.`,
  },
  Egypt: {
    title: 'Explore Egypt, Nile Heritage and Desert Parks',
    intro: `Egypt combines ancient monuments, Nile journeys, and Red Sea reefs with protected desert and marine areas. It works as a cultural journey, a diving holiday, or a North Africa complement to sub-Saharan safari routes.`,
  },
  Morocco: {
    title: 'Explore Morocco, Mountains, Medinas, and Coast',
    intro: `Morocco offers Atlas trekking, imperial cities, and Atlantic birding within a single cultural journey. Outdoor highlights often pair Marrakech, Fes, or desert camps with national parks in the mountains and coast.`,
  },
};

export function buildCountryDescription(country) {
  const parks = PARKS_BY_COUNTRY[country] || [];
  const meta = COUNTRY_INTROS[country];
  if (meta) {
    return buildFromIntro(country, meta.title, meta.intro, parks, meta.p2);
  }
  const names = parkList(country);
  return countryShell(
    `Explore ${country} Safari Tours`,
    `${country} is a distinctive safari and travel destination with protected areas that include ${joinParks(names.slice(0, 4))}. Eton Safaris plans private itineraries around seasonality, lodge style, and the experiences that matter most to you.`,
    flagshipParksParagraph(country, parks)
  );
}

export function countryHeadline(country) {
  return COUNTRY_INTROS[country]?.title || `Explore ${country} Safari Tours`;
}

/**
 * Category descriptions — Uganda-style title + two paragraphs naming relevant parks.
 */
export function buildCategoryDescription(categoryName, country, parks) {
  const name = String(categoryName || '').trim();
  const parkEntries = parks || [];
  const parkNames = parkEntries.map((p) => (typeof p === 'string' ? p : p.name));
  const listed = joinParks(parkNames.slice(0, 5));
  const lower = name.toLowerCase();

  if (/gorilla/i.test(lower)) {
    const gorillaParks = parkNames.filter((p) => /bwindi|mgahinga|volcanoes|virunga|kahuzi/i.test(p));
    const focus = joinParks(gorillaParks.length ? gorillaParks : parkNames.slice(0, 2));
    return `<p><b>${name}</b></p>
<p>${name} centre on permitted treks to habituated gorilla families, with logistics, permits, and lodge bases arranged around ${focus}. Eton Safaris times transfers realistically so trekking days stay focused on the forest rather than rushed road hours.</p>
<p>Beyond the trek itself, many guests add neighbouring parks such as ${listed} for a fuller ${country} journey. Clear briefings, fitness guidance, and transparent inclusions help first-time gorilla travellers feel prepared.</p>`;
  }

  if (/beach|island/i.test(lower)) {
    const coastal = parkNames.filter((p) => /bazaruto|curieuse|maputo|ras mohammed|table mountain|morne|vall|zanzibar/i.test(p));
    const focus = joinParks(coastal.length ? coastal : parkNames.slice(0, 3));
    return `<p><b>${name}</b></p>
<p>${name} combine Indian Ocean or coastal downtime with carefully chosen nature experiences. Protected areas such as ${focus} frame reef walks, island scenery, and relaxed beach days.</p>
<p>Eton Safaris links beach lodges with practical transfers and optional safari extensions in ${country}, keeping the holiday relaxed without losing the sense of place.</p>`;
  }

  if (/mountain|climbing|kilimanjaro|trek/i.test(lower) && /tanzania|morocco|ethiopia|uganda|rwanda|kenya/i.test(country)) {
    return `<p><b>${name}</b></p>
<p>${name} focus on highland routes, summit attempts, and scenic walks supported by experienced mountain crews. In ${country}, itineraries often reference ${listed} for acclimatization days, forest approaches, or cultural side trips.</p>
<p>Eton Safaris plans pacing, gear notes, and contingency days so climbers and trekkers balance challenge with recovery and safe mountain practice.</p>`;
  }

  if (/tour|cultural/i.test(lower) && !/wildlife|safari/i.test(lower)) {
    return `<p><b>${name}</b></p>
<p>${name} weave historic sites, local culture, and landscapes into a paced itinerary across ${country}. Nature chapters often include time near ${listed}, giving travellers wildlife or highland scenery alongside cities and heritage stops.</p>
<p>With Eton Safaris, routing stays practical: fewer hotel changes where possible, clear inclusions, and guiding that connects cultural days with the country's outdoor highlights.</p>`;
  }

  const flagship = parkEntries.slice(0, 4);
  const highlightLine =
    flagship.length > 0
      ? flagship
          .map((park) => {
            const pName = typeof park === 'string' ? park : park.name;
            const act = typeof park === 'object' && park.experiences ? String(park.experiences).split(',')[0].trim() : '';
            return act ? `${act} in ${pName}` : pName;
          })
          .slice(0, 3)
          .join(', ')
      : listed;

  return `<p><b>${name}</b></p>
<p>${name} are built around ${country}'s strongest protected areas, including ${listed}. Days typically mix game drives, boat or walking activities where available, and lodge nights chosen for location as much as comfort.</p>
<p>Signature experiences often include ${highlightLine}. Eton Safaris designs these itineraries with realistic road or flight links, seasonal wildlife focus, and room to combine neighbouring parks without exhausting transfers.</p>`;
}
