import type { PageFaq } from '@/lib/cms-page-model';
import { landingConversionCopy } from '@/lib/landing-page-copy';

const LIMIT = 4;

function take(faqs: PageFaq[], limit = LIMIT): PageFaq[] {
  const seen = new Set<string>();
  const unique: PageFaq[] = [];
  for (const faq of faqs) {
    const key = String(faq.question || '')
      .trim()
      .toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({ question: faq.question.trim(), answer: String(faq.answer || '').trim() });
    if (unique.length >= limit) break;
  }
  return unique;
}

const HOME_FAQS: PageFaq[] = [
  {
    question: 'Who is Eton Safaris?',
    answer:
      'Eton Safaris is a licensed Uganda-based safari company that plans gorilla trekking, wildlife safaris, and tailor-made journeys across Africa with local guides and a private fleet.',
  },
  {
    question: 'Which destinations do you cover?',
    answer:
      'We operate from Uganda across East and Southern Africa, including Kenya, Tanzania, Rwanda, Botswana, Zambia, and other safari countries, matching parks and lodges to your dates.',
  },
  {
    question: 'Can you tailor a safari to my budget and dates?',
    answer:
      'Yes. Share your travel window, group size, and style — luxury, mid-range, or a mix — and we build the route, permits, and stays around that brief.',
  },
  {
    question: 'How do I start a booking?',
    answer:
      'Request a quote, WhatsApp our team, or use the enquiry form. We confirm park fees, gorilla permits where needed, and a clear itinerary before you pay.',
  },
];

const TOURS_FAQS: PageFaq[] = [
  {
    question: 'Are these safari packages private or group tours?',
    answer:
      'Most Eton Safaris itineraries are private for your party. Group departures are only used when you ask for them or when a park activity is shared, such as a gorilla trek briefing.',
  },
  {
    question: 'Can I change the number of days on a published tour?',
    answer:
      'Yes. Published packages are starting points. We add or drop days, parks, and lodge styles so the trip matches your time and budget.',
  },
  {
    question: 'What is usually included in a safari package?',
    answer:
      'Park fees, listed activities, accommodation as shown, a driver-guide, and transport in a safari vehicle. International flights, visas, tips, and some drinks are typically extra.',
  },
  {
    question: 'How far in advance should I book?',
    answer:
      'Book gorilla permits and peak-season lodges 3–9 months ahead. Wildlife-only itineraries can often be confirmed closer to travel if camps have space.',
  },
];

const PARKS_FAQS: PageFaq[] = [
  {
    question: 'How do I choose a national park for my safari?',
    answer:
      'Start with the wildlife or landscape you want — gorillas, Big Five, migration, chimps, or desert — then we match parks that actually offer that experience in the country you are visiting.',
  },
  {
    question: 'Can I visit more than one park on the same trip?',
    answer:
      'Yes. Most itineraries link two to four parks with realistic driving or flight times so you are not rushing gates at last light.',
  },
  {
    question: 'Do I need permits for every national park?',
    answer:
      'Park entry is arranged with your safari. Special activities such as gorilla trekking, chimpanzee tracking, or climbing need extra permits that we book in advance.',
  },
  {
    question: 'When is the best time to visit African national parks?',
    answer:
      'Dry months usually mean easier game viewing. Gorilla trekking runs year-round. We plan around rains, migration timing, and your preferred landscapes.',
  },
];

const STAYS_FAQS: PageFaq[] = [
  {
    question: 'What kinds of safari accommodation do you book?',
    answer:
      'Lodges, tented camps, hotels, and bandas from mid-range to luxury, chosen for park access, comfort after long days, and the style you prefer.',
  },
  {
    question: 'Are the lodges inside the national park?',
    answer:
      'Some stays sit inside the park; others are on the edge or in a nearby gateway. We state the location clearly so you know drive times to the gate.',
  },
  {
    question: 'Can you mix luxury and mid-range lodges on one safari?',
    answer:
      'Yes. Many travellers use a luxury lodge for the highlight park and a practical mid-range stay on travel days.',
  },
  {
    question: 'Do rooms include meals?',
    answer:
      'Safari lodges often run full-board or game-package meals. Hotels may be bed-and-breakfast. Your itinerary lists the meal plan for each night.',
  },
];

const CONTACT_FAQS: PageFaq[] = [
  {
    question: 'How quickly will Eton Safaris reply?',
    answer:
      'We aim to answer quote and WhatsApp enquiries within one working day, faster during office hours in Uganda.',
  },
  {
    question: 'Where is your office?',
    answer:
      'Eton Safaris is based in Wakiso District, Central Region, Uganda, and plans departures across East and Southern Africa.',
  },
  {
    question: 'Can I call or WhatsApp instead of email?',
    answer:
      'Yes. Use the phone and WhatsApp numbers on this page for itinerary questions, permit status, and last-minute date checks.',
  },
  {
    question: 'Do you arrange airport pickups?',
    answer:
      'Yes. Meet-and-greet and private transfers can be added to any safari once we know your flight times.',
  },
];

function countryFaqs(countrySlug: string, countryName: string): PageFaq[] {
  const copy = landingConversionCopy(countrySlug, countryName);
  const extras: PageFaq[] = [
    {
      question: `What is the best time to visit ${countryName}?`,
      answer: `Dry seasons usually offer easier game drives. Eton Safaris plans ${countryName} dates around wildlife movements, trekking conditions, and your preferred weather.`,
    },
    {
      question: `How many days do I need in ${countryName}?`,
      answer: `A focused highlight can work in a few days. A satisfying ${countryName} safari with two or more parks is typically a week or more, depending on transfers.`,
    },
    {
      question: `Are ${countryName} safari prices all-inclusive?`,
      answer: `Quoted packages list what is included — parks, lodges, guiding, and transport. Flights, visas, tips, and some activities are shown separately so the budget stays clear.`,
    },
    {
      question: `Can I combine ${countryName} with a neighbouring country?`,
      answer: `Often yes. Cross-border itineraries work when logistics and permits allow — for example Uganda with Rwanda, or Kenya with Tanzania.`,
    },
  ];
  return take([...copy.faqs, ...extras]);
}

function categoryFaqs(categoryTitle: string, countrySlug: string, countryName: string): PageFaq[] {
  const rawTitle = String(categoryTitle || '').trim() || 'safari';
  const title =
    rawTitle
      .replace(
        /^(uganda|kenya|tanzania|rwanda|botswana|namibia|zambia|zimbabwe|south africa|dr congo|congo|egypt|ethiopia|madagascar|malawi|morocco|mozambique|seychelles)\s+/i,
        ''
      )
      .replace(/\s+safaris?$/i, '')
      .replace(/\s+tours?$/i, '')
      .trim() || rawTitle;
  const lower = `${rawTitle} ${title}`.toLowerCase();
  const gorilla = /gorilla/.test(lower);
  const chimp = /chimp/.test(lower);
  const beach = /beach|island|zanzibar|coast/.test(lower);
  const climb = /climb|mountain|kilimanjaro|rwenzori/.test(lower);
  const migration = /migration|wildebeest/.test(lower);
  const bird = /bird/.test(lower);
  const cultural = /cultur|community|heritage/.test(lower);
  const wildlife = /wildlife|game drive|safari/.test(lower) && !gorilla && !chimp && !beach && !climb && !migration;
  if (gorilla) {
    return take([
      {
        question: `What is included on a ${title} trip in ${countryName}?`,
        answer: gorillaCountries(countrySlug)
          ? `${title} covers gorilla permits, a lodge near the trailhead, a briefing, and a private transfer. Viewing time with the family is set by the park.`
          : `${countryName} is not a mountain gorilla destination. ${title} is arranged in Uganda, Rwanda, or DR Congo and can be combined with a ${countryName} safari.`,
      },
      {
        question: `How hard is ${title}?`,
        answer:
          'Treks vary from one to six hours on forest trails. Porters are available. We match you to a sector and pace that fit your fitness.',
      },
      {
        question: `How far ahead should I book ${title} permits?`,
        answer:
          'Peak months fill 3–9 months ahead. We check current park availability before we confirm your dates.',
      },
      {
        question: `Can children join ${title}?`,
        answer:
          'Minimum ages are set by the parks — typically 15 in Uganda and Rwanda. We plan family wildlife days for younger travellers instead of the trek.',
      },
    ]);
  }
  if (chimp) {
    return take([
      {
        question: `Does ${countryName} offer ${title}?`,
        answer: /uganda|rwanda|tanzania/.test(countrySlug)
          ? `Yes. ${title} in ${countryName} is arranged with park permits and a realistic forest start time.`
          : `Chimpanzee tracking is strongest in Uganda, Rwanda, and western Tanzania. We will not put chimps on a ${countryName} title when that park system does not offer them.`,
      },
      {
        question: `How long does ${title} take?`,
        answer: 'Most chimp walks last two to four hours. You stay with a habituated community for a limited viewing window.',
      },
      {
        question: `Do I need to be very fit for ${title}?`,
        answer: 'Forest trails can be steep and muddy. We brief you on footwear, rain gear, and whether a lighter wildlife day is a better fit.',
      },
      {
        question: `Can ${title} be combined with gorilla trekking?`,
        answer: 'In Uganda and Rwanda, yes — Kibale or Nyungwe chimps pair well with Bwindi, Mgahinga, or Volcanoes gorilla trekking.',
      },
    ]);
  }
  if (beach) {
    return take([
      {
        question: `Can I add ${title} after a ${countryName} safari?`,
        answer: /kenya|tanzania|mozambique|seychelles|madagascar/.test(countrySlug)
          ? `Yes. ${title} uses genuine coastal or island rest days that we add after the safari circuit.`
          : `${countryName} is inland safari country. Beach time is added in Kenya, Tanzania (Zanzibar), or the Indian Ocean islands.`,
      },
      {
        question: `When should ${title} come in the itinerary?`,
        answer: 'Usually after the safari, so you rest when game drives are done. We can reverse that if your flights work better the other way.',
      },
      {
        question: `Are ${title} days private or resort-based?`,
        answer: 'We book lodges or hotels that match your safari style — quiet boutique stays or family resorts — and handle the transfer.',
      },
      {
        question: `Is snorkelling or diving included in ${title}?`,
        answer: 'Water activities are listed when the destination supports them. They are optional extras unless your quote says otherwise.',
      },
    ]);
  }
  if (climb) {
    return take([
      {
        question: `Can I do ${title} in ${countryName}?`,
        answer: /tanzania|uganda/.test(countrySlug)
          ? `Yes. ${title} is planned with the right days and altitude profile on routes that ${countryName} actually supports.`
          : `Serious high-altitude climbs are not a ${countryName} product. We keep mountain titles on Tanzania and Uganda routes that actually support them.`,
      },
      {
        question: `How many days do I need for ${title}?`,
        answer: 'Kilimanjaro is typically 6–8 days on the mountain. Rwenzori treks vary. We never compress a summit into a short wildlife title.',
      },
      {
        question: `Can I combine ${title} with a wildlife safari?`,
        answer: 'Yes. Most travellers safari first or rest after the summit. We keep transfer days honest so you are not exhausted at the park gate.',
      },
      {
        question: `Do you provide crew and gear for ${title}?`,
        answer: 'Guides, porters, and park fees are arranged. Personal clothing lists are sent before travel; technical hire is listed in the quote.',
      },
    ]);
  }
  if (migration) {
    return take([
      {
        question: `Can I see the Great Migration on ${title} in ${countryName}?`,
        answer: /kenya|tanzania/.test(countrySlug)
          ? `Yes. ${countryName} is on the Serengeti–Mara circuit. We time camps to the season you travel.`
          : `The wildebeest migration is a Kenya and Tanzania event. We will not title a ${countryName} safari as a migration trip.`,
      },
      {
        question: `When are river crossings on ${title}?`,
        answer: 'Mara River crossings are most likely in the Kenyan dry season (roughly July–October). Calving is in the southern Serengeti around January–March.',
      },
      {
        question: `Is the migration guaranteed on my ${title} dates?`,
        answer: 'Herds move with rain. We place you in the right sector and keep expectations honest if the timing is shoulder season.',
      },
      {
        question: `Do I need a balloon safari with ${title}?`,
        answer: 'Balloons are optional and weather-dependent. We can add one in Masai Mara or Serengeti when you want that sunrise view.',
      },
    ]);
  }
  if (bird) {
    return take([
      {
        question: `What makes ${title} in ${countryName} special?`,
        answer: `${countryName} has strong birding habitats for this category — forests, wetlands, and savannah — and we plan early starts with a guide who knows the local list.`,
      },
      {
        question: `When is the best time for ${title}?`,
        answer: 'Palearctic migrants peak around November–April in East Africa. Residents are year-round. We match parks to the season you travel.',
      },
      {
        question: `Do I need special gear for ${title}?`,
        answer: 'Binoculars are essential. A spotting scope helps on water and open plains. We advise on vehicle rest boards and packing before you fly.',
      },
      {
        question: `Can ${title} be combined with a wildlife safari?`,
        answer: 'Yes. Many itineraries mix focused birding mornings with game drives so non-birders in the group still enjoy the parks.',
      },
    ]);
  }
  if (cultural) {
    return take([
      {
        question: `What will I experience on ${title} in ${countryName}?`,
        answer: `${title} is hosted with local communities — village visits, crafts, music, or food — arranged respectfully and paid fairly, not as a roadside stop.`,
      },
      {
        question: `Is ${title} suitable for families?`,
        answer: 'Yes. We brief hosts on ages in your group and keep visits unhurried so children can take part without a long lecture.',
      },
      {
        question: `How long is a typical ${title} visit?`,
        answer: 'Most community visits last two to four hours. Overnight homestays are only added when you ask for them.',
      },
      {
        question: `Can I combine ${title} with wildlife or gorilla days?`,
        answer: `Yes. Cultural days sit well between park transfers so ${title} does not replace game time you came for.`,
      },
    ]);
  }
  if (wildlife) {
    return take([
      {
        question: `What animals will I see on ${title} in ${countryName}?`,
        answer: `${title} focuses on the parks and habitats ${countryName} is known for — savannah game drives, boat cruises where available, and lodges close to the wildlife you came to see.`,
      },
      {
        question: `How many days do I need for ${title}?`,
        answer: `A short ${title} highlight can work in a few days. A fuller ${countryName} wildlife circuit with two or more parks is typically a week or more.`,
      },
      {
        question: `When is the best time for ${title} in ${countryName}?`,
        answer: `Dry months usually mean easier game viewing. We plan ${title} around rains, park roads, and the wildlife movements that matter for your dates.`,
      },
      {
        question: `Can I add gorilla trekking or beach time to ${title}?`,
        answer: `Yes, only where those experiences exist. We keep ${title} as the wildlife core and add gorillas, chimps, or beach days in destinations that actually offer them.`,
      },
    ]);
  }
  return take([
    {
      question: `What is included on ${title} in ${countryName}?`,
      answer: `${title} packages list park fees, the activities that belong to this category, lodges, a driver-guide, and transport. Flights, visas, and optional extras are shown separately.`,
    },
    {
      question: `How many days do I need for ${title}?`,
      answer: `A focused ${title} highlight can work in a few days. A fuller ${countryName} circuit in this category is typically a week, depending on transfers between parks.`,
    },
    {
      question: `When is the best time for ${title} in ${countryName}?`,
      answer: `We plan ${title} around wildlife movements, trekking or park conditions, and the season you prefer. Share your dates and we will say if they suit this category.`,
    },
    {
      question: `Can I combine ${title} with another safari style?`,
      answer: `Yes. ${title} is a starting point. We add gorilla trekking, chimps, wildlife, or beach days only where ${countryName} actually offers those experiences.`,
    },
  ]);
}

function gorillaCountries(slug: string) {
  return /uganda|rwanda|dr-congo|congo/.test(slug);
}

export function bestFaqsFor(
  area:
    | 'home'
    | 'country'
    | 'category'
    | 'tours'
    | 'parks'
    | 'park'
    | 'accommodations'
    | 'stay'
    | 'contact'
    | 'tour',
  context: { countrySlug?: string; countryName?: string; categoryTitle?: string; title?: string } = {}
): PageFaq[] {
  const countrySlug = String(context.countrySlug || '').toLowerCase();
  const countryName = context.countryName || context.title || 'this destination';
  switch (area) {
    case 'home':
      return take(HOME_FAQS);
    case 'tours':
      return take(TOURS_FAQS);
    case 'parks':
    case 'park':
      return take(PARKS_FAQS);
    case 'accommodations':
    case 'stay':
      return take(STAYS_FAQS);
    case 'contact':
      return take(CONTACT_FAQS);
    case 'category':
      return categoryFaqs(context.categoryTitle || context.title || '', countrySlug, countryName);
    case 'tour':
      return categoryFaqs(context.categoryTitle || context.title || '', countrySlug, countryName);
    case 'country':
    default:
      return countryFaqs(countrySlug, countryName);
  }
}

export function limitFaqs(stored: PageFaq[] | undefined, fallback: PageFaq[]): PageFaq[] {
  const cleaned = (stored || []).filter((faq) => faq.question?.trim() && faq.answer?.trim());
  return take([...cleaned, ...fallback]);
}
