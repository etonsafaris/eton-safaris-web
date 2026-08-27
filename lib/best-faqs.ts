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
  const title = categoryTitle.toLowerCase();
  const gorilla = /gorilla/.test(title);
  const chimp = /chimp/.test(title);
  const beach = /beach|island|zanzibar|coast/.test(title);
  const climb = /climb|mountain|kilimanjaro|rwenzori/.test(title);
  const migration = /migration|wildebeest/.test(title);
  if (gorilla) {
    return take([
      {
        question: `Where can I gorilla trek from ${countryName}?`,
        answer: gorillaCountries(countrySlug)
          ? `${countryName} is a genuine mountain gorilla destination. Eton Safaris books the correct park permits and a lodge close to the trailhead.`
          : `${countryName} is not a mountain gorilla destination. Gorilla trekking is arranged in Uganda, Rwanda, or DR Congo, and can be combined with a ${countryName} safari.`,
      },
      {
        question: 'How hard is gorilla trekking?',
        answer:
          'Treks vary from one to six hours on forest trails. Porters are available. We match you to a sector and pace that fit your fitness.',
      },
      {
        question: 'How far ahead should I book gorilla permits?',
        answer:
          'Peak months fill 3–9 months ahead. We check current Uganda Wildlife Authority, Rwanda Development Board, or Virunga availability before we confirm your dates.',
      },
      {
        question: 'Can children gorilla trek?',
        answer:
          'Minimum ages are set by the parks — typically 15 in Uganda and Rwanda. We plan family wildlife days for younger travellers instead of the trek.',
      },
    ]);
  }
  if (chimp) {
    return take([
      {
        question: `Does ${countryName} offer chimpanzee tracking?`,
        answer: /uganda|rwanda|tanzania/.test(countrySlug)
          ? `Yes. Chimpanzee tracking in ${countryName} is arranged with park permits and a realistic forest start time.`
          : `Chimpanzee tracking is strongest in Uganda, Rwanda, and western Tanzania. We will not put chimps on a ${countryName} title when that park system does not offer them.`,
      },
      {
        question: 'How long does chimpanzee tracking take?',
        answer: 'Most chimp walks last two to four hours. You stay with a habituated community for a limited viewing window.',
      },
      {
        question: 'Do I need to be very fit?',
        answer: 'Forest trails can be steep and muddy. We brief you on footwear, rain gear, and whether a lighter wildlife day is a better fit.',
      },
      {
        question: 'Can chimps be combined with gorillas?',
        answer: 'In Uganda and Rwanda, yes — Kibale or Nyungwe chimps pair well with Bwindi, Mgahinga, or Volcanoes gorilla trekking.',
      },
    ]);
  }
  if (beach) {
    return take([
      {
        question: `Can I add a beach stay to a ${countryName} safari?`,
        answer: /kenya|tanzania|mozambique|seychelles|madagascar/.test(countrySlug)
          ? `Yes. ${countryName} has genuine coastal or island rest days that we add after the safari circuit.`
          : `${countryName} is inland safari country. Beach time is added in Kenya, Tanzania (Zanzibar), or the Indian Ocean islands — not forced into this destination title.`,
      },
      {
        question: 'When should the beach come in the itinerary?',
        answer: 'Usually after the safari, so you rest when game drives are done. We can reverse that if your flights work better the other way.',
      },
      {
        question: 'Are beach days private or resort-based?',
        answer: 'We book lodges or hotels that match your safari style — quiet boutique stays or family resorts — and handle the transfer.',
      },
      {
        question: 'Is snorkelling or diving included?',
        answer: 'Water activities are listed when the destination supports them. They are optional extras unless your quote says otherwise.',
      },
    ]);
  }
  if (climb) {
    return take([
      {
        question: `Can I climb in ${countryName}?`,
        answer: /tanzania|uganda/.test(countrySlug)
          ? `${countryName} has genuine climbing — Kilimanjaro, Meru, or the Rwenzoris — planned with the right days and altitude profile.`
          : `Serious high-altitude climbs are not a ${countryName} product. We keep mountain titles on Tanzania and Uganda routes that actually support them.`,
      },
      {
        question: 'How many days do I need for a climb?',
        answer: 'Kilimanjaro is typically 6–8 days on the mountain. Rwenzori treks vary. We never compress a summit into a 3-day wildlife title.',
      },
      {
        question: 'Can I combine a climb with a safari?',
        answer: 'Yes. Most travellers safari first or rest after the summit. We keep transfer days honest so you are not exhausted at the park gate.',
      },
      {
        question: 'Do you provide climbing crew and gear?',
        answer: 'Guides, porters, and park fees are arranged. Personal clothing lists are sent before travel; technical hire is listed in the quote.',
      },
    ]);
  }
  if (migration) {
    return take([
      {
        question: `Can I see the Great Migration in ${countryName}?`,
        answer: /kenya|tanzania/.test(countrySlug)
          ? `Yes. ${countryName} is on the Serengeti–Mara migration circuit. We time camps to the season you travel.`
          : `The wildebeest migration is a Kenya and Tanzania event. We will not title a ${countryName} safari as a migration trip.`,
      },
      {
        question: 'When are river crossings?',
        answer: 'Mara River crossings are most likely in the Kenyan dry season (roughly July–October). Calving is in the southern Serengeti around January–March.',
      },
      {
        question: 'Is the migration guaranteed on my dates?',
        answer: 'Herds move with rain. We place you in the right sector and keep expectations honest if the timing is shoulder season.',
      },
      {
        question: 'Do I need a balloon safari?',
        answer: 'Balloons are optional and weather-dependent. We can add one in Masai Mara or Serengeti when you want that sunrise view.',
      },
    ]);
  }
  return countryFaqs(countrySlug, countryName);
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
