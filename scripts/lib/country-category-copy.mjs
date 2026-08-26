/**
 * Curated country & category HTML for destinations missing substantial descriptions.
 * Voice matches existing Uganda/Botswana CMS pages: bold title + two rich paragraphs naming parks.
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

/** @type {Record<string, { title: string, build: (parks: string[]) => string }>} */
export const COUNTRY_COPY = {
  Namibia: {
    title: 'Explore Namibia, Land of Contrasts',
    build(parks) {
      return countryShell(
        this.title,
        `Namibia is a southern African destination defined by open horizons, desert light, and wildlife that concentrates around scarce water. Travellers come for dune landscapes, Atlantic wilderness, and classic game viewing, with itineraries that often centre on ${joinParks(parks)}. The country’s scale rewards unhurried circuits, private guiding, and photography timed around sunrise and sunset.`,
        `Etosha National Park anchors many Namibia wildlife safaris with waterhole drama, while Namib Naukluft National Park delivers the red dunes of Sossusvlei and Deadvlei. Skeleton Coast National Park adds a remote Atlantic edge of fog banks and shipwreck shores. Eton Safaris shapes Namibia routes around realistic driving days, lodge style, and the seasons that best match your interests.`
      );
    },
  },
  Zambia: {
    title: 'Explore Zambia, Home of the Walking Safari',
    build(parks) {
      return countryShell(
        this.title,
        `Zambia is one of Africa’s most authentic safari countries, known for walking safaris, river-focused game viewing, and camps that sit close to wilderness. Signature parks include ${joinParks(parks)}, each offering a different pace of bush time. Guests who value guiding quality and fewer crowds often place Zambia high on a southern Africa itinerary.`,
        `South Luangwa National Park is famous for walking safaris and night drives, Lower Zambezi National Park pairs canoeing with riverbank wildlife, and Kafue National Park opens into vast plains and woodland. Many travellers also combine Zambia with Victoria Falls for a seamless safari-and-falls journey planned by Eton Safaris.`
      );
    },
  },
  Zimbabwe: {
    title: 'Explore Zimbabwe, Falls and Wild Frontiers',
    build(parks) {
      return countryShell(
        this.title,
        `Zimbabwe blends one of the world’s great natural wonders with predator-rich parks and canoe country along the Zambezi. Core safari areas include ${joinParks(parks)}. The country suits travellers who want classic game drives, walking where permitted, and time at the falls in a single well-paced route.`,
        `Hwange National Park delivers elephant gatherings and waterhole viewing, Mana Pools National Park is celebrated for canoeing and close walking encounters, and Matobo National Park adds rhino tracking among granite kopjes. Victoria Falls National Park protects the Zimbabwean viewpoints of the falls, making an ideal start or finish with Eton Safaris.`
      );
    },
  },
  'South Africa': {
    title: 'Explore South Africa, Big Five and Beyond',
    build(parks) {
      return countryShell(
        this.title,
        `South Africa combines reliable Big Five safari with city, coast, and wine country in one passport-friendly journey. Flagship protected areas include ${joinParks(parks)}. It is an excellent first safari destination and a flexible add-on to East or Southern Africa circuits.`,
        `Kruger National Park remains the classic self-drive or guided Big Five reserve, Addo Elephant National Park highlights elephants and Eastern Cape wilderness, and Pilanesberg National Park is convenient for short safari breaks near Johannesburg. Table Mountain National Park frames Cape Town with fynbos, Cape Point, and peninsula scenery that Eton Safaris often pairs with wildlife days.`
      );
    },
  },
  Malawi: {
    title: 'Explore Malawi, the Warm Heart of Africa',
    build(parks) {
      return countryShell(
        this.title,
        `Malawi pairs freshwater lake holidays with recovering wildlife parks and warm hospitality. Travellers explore ${joinParks(parks)} alongside beach time on Lake Malawi. The country works well as a compact safari-and-lake holiday or a softer-paced southern Africa extension.`,
        `Liwonde National Park offers riverboat safaris and strong birding, Majete Wildlife Reserve is a Big Five conservation success story, and Nyika National Park brings highland grasslands and cooler plateau scenery. Eton Safaris designs Malawi itineraries that balance park game viewing with lake rest days.`
      );
    },
  },
  Mozambique: {
    title: 'Explore Mozambique, Safari Coast and Islands',
    build(parks) {
      return countryShell(
        this.title,
        `Mozambique is a coastline-and-wilderness destination where savannah parks meet Indian Ocean islands. Key protected areas include ${joinParks(parks)}. Guests often combine wildlife days with snorkelling, diving, and quiet beach lodges.`,
        `Gorongosa National Park showcases a rebounding Rift Valley wilderness, Bazaruto Archipelago National Park delivers turquoise channels and marine life, and Maputo Special Reserve offers elephants and coastal lakes close to the capital. Eton Safaris builds Mozambique trips around seasonality, transfers, and the right mix of safari and beach.`
      );
    },
  },
  Seychelles: {
    title: 'Explore Seychelles, Island Nature Escapes',
    build(parks) {
      return countryShell(
        this.title,
        `Seychelles is an Indian Ocean island destination of granite peaks, palm forests, and clear reefs. Nature time centres on ${joinParks(parks)}, ideal after an East African safari or as a standalone beach holiday. Trails, marine parks, and island hopping define the experience more than classic savannah game drives.`,
        `Morne Seychellois National Park covers misty mountains on Mahé, Vallée de Mai Nature Reserve protects the coco de mer palm forest on Praslin, and Curieuse Marine National Park is known for giant tortoises and shallow reefs. Eton Safaris arranges island combinations with practical ferry and flight logistics.`
      );
    },
  },
  Morocco: {
    title: 'Explore Morocco, Mountains, Medinas, and Coast',
    build(parks) {
      return countryShell(
        this.title,
        `Morocco offers Atlas trekking, imperial cities, and Atlantic birding within a single cultural journey. Outdoor highlights include ${joinParks(parks)}, often paired with Marrakech, Fes, or desert camps. It is a strong North Africa complement to sub-Saharan safari itineraries.`,
        `Toubkal National Park is the gateway to North Africa’s highest peak and Berber villages, Ifrane National Park is known for cedar forests and Barbary macaques, and Souss Massa National Park protects coastal estuaries and rare northern bald ibis habitat. Eton Safaris plans Morocco routes with clear pacing between cities, mountains, and coast.`
      );
    },
  },
};

/**
 * Category descriptions for thin/empty category rows.
 * Mentions relevant parks so hyperlinking can attach /parks URLs.
 */
export function buildCategoryDescription(categoryName, country, parks) {
  const name = String(categoryName || '').trim();
  const parkNames = parks.map((p) => p.name);
  const listed = joinParks(parkNames);
  const lower = name.toLowerCase();

  if (/gorilla/i.test(lower)) {
    const gorillaParks = parkNames.filter((p) => /bwindi|mgahinga|volcanoes|virunga|kahuzi/i.test(p));
    const focus = joinParks(gorillaParks.length ? gorillaParks : parkNames.slice(0, 2));
    return `<p><b>${name}</b></p>
<p>${name} centre on permitted treks to habituated gorilla families, with logistics, permits, and lodge bases arranged around ${focus}. Eton Safaris times transfers realistically so trekking days stay focused on the forest rather than rushed road hours.</p>
<p>Beyond the trek itself, many guests add neighbouring parks and cultural visits for a fuller ${country} journey. Clear briefings, fitness guidance, and transparent inclusions help first-time gorilla travellers feel prepared.</p>`;
  }

  if (/beach|island/i.test(lower)) {
    const coastal = parkNames.filter((p) => /bazaruto|curieuse|maputo|ras mohammed|table mountain|morne|vall/i.test(p));
    const focus = joinParks(coastal.length ? coastal : parkNames);
    return `<p><b>${name}</b></p>
<p>${name} combine Indian Ocean or coastal downtime with carefully chosen nature experiences. Where protected areas frame the coast, guests often visit ${focus} for walks, reefs, or island scenery between beach days.</p>
<p>Eton Safaris links beach lodges with practical transfers and optional safari extensions in ${country}, keeping the holiday relaxed without losing the sense of place.</p>`;
  }

  if (/mountain|climbing|kilimanjaro|trek/i.test(lower) && /tanzania|morocco|ethiopia/i.test(country)) {
    return `<p><b>${name}</b></p>
<p>${name} focus on highland routes, summit attempts, and scenic walks supported by experienced mountain crews. In ${country}, itineraries often reference ${listed} for acclimatization days, forest approaches, or cultural side trips.</p>
<p>Eton Safaris plans pacing, gear notes, and contingency days so climbers and trekkers balance challenge with recovery and safe mountain practice.</p>`;
  }

  if (/tour|cultural/i.test(lower) && !/wildlife|safari/i.test(lower)) {
    return `<p><b>${name}</b></p>
<p>${name} weave historic sites, local culture, and landscapes into a paced itinerary across ${country}. Nature chapters often include time near ${listed}, giving travellers wildlife or highland scenery alongside cities and heritage stops.</p>
<p>With Eton Safaris, routing stays practical: fewer hotel changes where possible, clear inclusions, and guiding that connects cultural days with the country’s outdoor highlights.</p>`;
  }

  // Default wildlife / safari category
  return `<p><b>${name}</b></p>
<p>${name} are built around ${country}'s strongest protected areas, including ${listed}. Days typically mix game drives, boat or walking activities where available, and lodge nights chosen for location as much as comfort.</p>
<p>Eton Safaris designs these itineraries with realistic road or flight links, seasonal wildlife focus, and room to combine neighbouring parks without exhausting transfers. The goal is more time in the field and clearer logistics from the first planning call to departure.</p>`;
}

export function countryHeadline(country) {
  return COUNTRY_COPY[country]?.title || `Explore ${country} Safari Tours`;
}

export function buildCountryDescription(country) {
  const parks = parkList(country);
  const entry = COUNTRY_COPY[country];
  if (entry) return entry.build(parks);
  return countryShell(
    `Explore ${country}`,
    `${country} is a distinctive safari and travel destination, with protected areas that include ${joinParks(parks)}. Eton Safaris plans private itineraries around seasonality, lodge style, and the experiences that matter most to you.`,
    `From first enquiry to departure, our team handles park logistics, transfers, and guiding so you can focus on wildlife and landscape time in ${country}.`
  );
}
