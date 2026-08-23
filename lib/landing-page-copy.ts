import { SITE_MEDIA } from '@/lib/site-media';
import type { PageFaq } from '@/lib/cms-page-model';

export type LandingConversionCopy = {
  h1: string;
  offerLine: string;
  toursHeading: string;
  readyHeading: string;
  seoIntro: string;
  faqs: PageFaq[];
};

const DEFAULTS: Record<string, LandingConversionCopy> = {
  uganda: {
    h1: 'Uganda Gorilla Trekking Tours & Wildlife Safaris',
    offerLine: 'Available Gorilla Permits | 40% Off Discount | Local Based Operator',
    toursHeading: 'Top Uganda Gorilla Trekking & Wildlife Safari Tours',
    readyHeading: 'Are You Ready To Start Your Uganda Safari With Us ?',
    seoIntro:
      'Plan gorilla trekking in Bwindi and Mgahinga, chimpanzee tracking in Kibale Forest, and wildlife safaris in Queen Elizabeth, Murchison Falls, and Lake Mburo with a licensed Uganda operator. Permits, lodges, and private 4x4 transport are arranged around your dates and budget.',
    faqs: [
      {
        question: 'How do I book a gorilla trekking permit in Uganda?',
        answer:
          'Eton Safaris reserves Uganda Wildlife Authority gorilla permits for Bwindi and Mgahinga against your confirmed dates. Permits are limited, so early booking is recommended — especially for June–September and December–February.',
      },
      {
        question: 'Is Uganda good for first-time gorilla trekking?',
        answer:
          'Yes. Uganda holds more than half of the world’s remaining mountain gorillas, with trekking in Bwindi and Mgahinga plus chimpanzee tracking in Kibale.',
      },
      {
        question: 'How many days do I need for a Uganda gorilla safari?',
        answer:
          'A focused gorilla trek can work in 3–4 days from Kampala or Kigali. Combining chimps, the Nile, and classic parks typically needs 7–12 days.',
      },
      {
        question: 'Is Eton Safaris a local Uganda safari operator?',
        answer:
          'Yes. Eton Safaris is a licensed tours and travel company based in Wakiso, Uganda, with guides and a private safari fleet for gorilla trekking and wildlife itineraries.',
      },
    ],
  },
  kenya: {
    h1: 'Kenya Safari Tours & Wildlife Holidays',
    offerLine: 'Masai Mara Migration | Big Five Game Drives | Local Based Operator',
    toursHeading: 'Top Kenya Safari & Wildlife Tours',
    readyHeading: 'Are You Ready To Start Your Kenya Safari With Us ?',
    seoIntro:
      'Discover Kenya safari tours across the Masai Mara, Amboseli, Tsavo, and the coast. Eton Safaris designs Big Five game drives, Great Migration itineraries, and beach extensions with local guides.',
    faqs: [
      {
        question: 'When is the Great Migration in Kenya?',
        answer:
          'Wildebeest typically reach the Masai Mara from late June through October, with Mara River crossings most likely in the dry season.',
      },
      {
        question: 'Can I combine a Kenya safari with the beach?',
        answer: 'Yes. Many travellers add Mombasa or Diani after Masai Mara, Amboseli, or Tsavo.',
      },
    ],
  },
  tanzania: {
    h1: 'Tanzania Safari Tours, Serengeti & Kilimanjaro',
    offerLine: 'Great Migration | Ngorongoro Crater | Local Based Operator',
    toursHeading: 'Top Tanzania Safari & Kilimanjaro Tours',
    readyHeading: 'Are You Ready To Start Your Tanzania Safari With Us ?',
    seoIntro:
      'Tanzania safari tours cover the Serengeti, Ngorongoro Crater, Tarangire, and Zanzibar beach extensions, plus Kilimanjaro climbs with experienced local teams.',
    faqs: [
      {
        question: 'What is Tanzania best known for on safari?',
        answer:
          'The Serengeti, Ngorongoro Crater, Kilimanjaro, and Zanzibar beaches — plus the annual wildebeest migration.',
      },
      {
        question: 'Is Zanzibar part of a Tanzania safari?',
        answer:
          'Zanzibar is a popular beach extension after northern-circuit parks such as Serengeti and Ngorongoro.',
      },
    ],
  },
  rwanda: {
    h1: 'Rwanda Gorilla Trekking Tours & Wildlife Safaris',
    offerLine: 'Volcanoes National Park Permits | Golden Monkey Treks | Local Based Operator',
    toursHeading: 'Top Rwanda Gorilla Trekking & Wildlife Safari Tours',
    readyHeading: 'Are You Ready To Start Your Rwanda Safari With Us ?',
    seoIntro:
      'Rwanda gorilla trekking in Volcanoes National Park, golden monkeys, Nyungwe chimps, and Akagera Big Five — planned by Eton Safaris from Uganda.',
    faqs: [
      {
        question: 'Where do you gorilla trek in Rwanda?',
        answer:
          'Volcanoes National Park is the primary gorilla trekking destination, with golden monkey treks and nearby Lake Kivu add-ons.',
      },
      {
        question: 'Can Rwanda be combined with Uganda?',
        answer:
          'Yes. Many itineraries pair Volcanoes gorilla trekking with Uganda parks or Nyungwe chimpanzee and canopy walks.',
      },
    ],
  },
  botswana: {
    h1: 'Botswana Safari Tours & Okavango Delta Holidays',
    offerLine: 'Okavango Delta | Chobe Elephants | Local Based Operator',
    toursHeading: 'Top Botswana Safari Tours',
    readyHeading: 'Are You Ready To Start Your Botswana Safari With Us ?',
    seoIntro:
      'Botswana safari tours focus on the Okavango Delta, Chobe National Park, and the Kalahari — mokoro, game drives, and conservation-led camps.',
    faqs: [
      {
        question: 'What is Botswana known for on safari?',
        answer: 'The Okavango Delta, Chobe elephants, and high-quality game viewing in a conservation-led tourism model.',
      },
    ],
  },
  egypt: {
    h1: 'Egypt Tours, Pyramids & Nile Cruises',
    offerLine: 'Pyramids of Giza | Nile Cruises | Tailor-Made Journeys',
    toursHeading: 'Top Egypt Tours & Nile Journeys',
    readyHeading: 'Are You Ready To Start Your Egypt Tour With Us ?',
    seoIntro:
      'Egypt tours pair the Pyramids of Giza, Luxor temples, and Nile cruises with optional Red Sea rest days, often combined with an East Africa safari.',
    faqs: [
      {
        question: 'Can Egypt be combined with an East Africa safari?',
        answer: 'Yes. Many travellers add Cairo or a Nile cruise before or after gorilla trekking and wildlife parks.',
      },
    ],
  },
  namibia: {
    h1: 'Namibia Safari Tours & Desert Landscapes',
    offerLine: 'Sossusvlei Dunes | Etosha Wildlife | Local Planning',
    toursHeading: 'Top Namibia Safari Tours',
    readyHeading: 'Are You Ready To Start Your Namibia Safari With Us ?',
    seoIntro:
      'Namibia safari tours cover Sossusvlei dunes, Etosha National Park wildlife, the Skeleton Coast, and desert-adapted game viewing.',
    faqs: [
      {
        question: 'Is Namibia a self-drive or guided safari destination?',
        answer: 'Both. Eton Safaris can arrange a guided Namibia safari or a structured self-drive with lodges and parks booked in advance.',
      },
    ],
  },
  'south-africa': {
    h1: 'South Africa Safari Tours & Garden Route Holidays',
    offerLine: 'Kruger Big Five | Cape Town | Garden Route',
    toursHeading: 'Top South Africa Safari & Tour Packages',
    readyHeading: 'Are You Ready To Start Your South Africa Safari With Us ?',
    seoIntro:
      'South Africa safari tours combine Kruger or private reserves with Cape Town, the Garden Route, and wine country — a flexible Big Five and city itinerary.',
    faqs: [
      {
        question: 'Where is the best Big Five safari in South Africa?',
        answer: 'Kruger National Park and nearby private reserves offer strong Big Five viewing, often paired with Cape Town.',
      },
    ],
  },
  'dr-congo': {
    h1: 'DR Congo Gorilla Trekking & Virunga Tours',
    offerLine: 'Virunga Gorillas | Nyiragongo | Specialist Permits',
    toursHeading: 'Top DR Congo Gorilla Trekking Tours',
    readyHeading: 'Are You Ready To Start Your DR Congo Safari With Us ?',
    seoIntro:
      'DR Congo tours focus on Virunga National Park gorilla trekking and Nyiragongo volcano hikes, planned with current access and permit advice.',
    faqs: [
      {
        question: 'Is gorilla trekking possible in DR Congo?',
        answer: 'Yes, in Virunga when parks are open. Eton Safaris confirms permits and security guidance before travel.',
      },
    ],
  },
  ethiopia: {
    h1: 'Ethiopia Tours & Cultural Safaris',
    offerLine: 'Simien Mountains | Historic North | Cultural Routes',
    toursHeading: 'Top Ethiopia Tours & Cultural Safaris',
    readyHeading: 'Are You Ready To Start Your Ethiopia Tour With Us ?',
    seoIntro:
      'Ethiopia tours explore the Simien Mountains, Lalibela churches, the historic north, and Rift Valley landscapes as a cultural complement to East African wildlife safaris.',
    faqs: [
      {
        question: 'Is Ethiopia a wildlife or cultural destination?',
        answer: 'Primarily cultural and highland landscapes, with unique wildlife in the Simiens and Bale Mountains.',
      },
    ],
  },
  malawi: {
    h1: 'Malawi Safari Tours & Lake Holidays',
    offerLine: 'Lake Malawi | Liwonde Wildlife | Beach & Bush',
    toursHeading: 'Top Malawi Safari & Lake Tours',
    readyHeading: 'Are You Ready To Start Your Malawi Safari With Us ?',
    seoIntro:
      'Malawi combines Lake Malawi swimming and snorkelling with Liwonde and Majete game viewing — a compact safari-and-lake holiday.',
    faqs: [
      {
        question: 'What is Malawi best known for?',
        answer: 'Lake Malawi, plus recovering wildlife parks such as Liwonde and Majete.',
      },
    ],
  },
  zambia: {
    h1: 'Zambia Safari Tours & Victoria Falls',
    offerLine: 'South Luangwa Walking Safaris | Victoria Falls | Local Operator',
    toursHeading: 'Top Zambia Safari Tours',
    readyHeading: 'Are You Ready To Start Your Zambia Safari With Us ?',
    seoIntro:
      'Zambia safari tours are known for South Luangwa walking safaris, the Luangwa River, and Victoria Falls — a classic walking-safari destination.',
    faqs: [
      {
        question: 'Why choose Zambia for safari?',
        answer: 'South Luangwa is famous for walking safaris and authentic bush camps, often combined with Victoria Falls.',
      },
    ],
  },
};

function fallbackCopy(countryName: string): LandingConversionCopy {
  return {
    h1: `${countryName} Safari Tours & Wildlife Holidays`,
    offerLine: 'Tailor-Made Itineraries | Expert Local Guides | Licensed Operator',
    toursHeading: `Top ${countryName} Safari & Wildlife Tours`,
    readyHeading: `Are You Ready To Start Your ${countryName} Safari With Us ?`,
    seoIntro: `Discover ${countryName} safari tours with Eton Safaris — tailor-made wildlife, trekking, and cultural itineraries from a licensed East Africa operator.`,
    faqs: [
      {
        question: `Why book a ${countryName} safari with a local operator?`,
        answer: `Eton Safaris plans ${countryName} itineraries from Uganda with licensed guides, current park fees, and lodges matched to your budget.`,
      },
    ],
  };
}

export function landingConversionCopy(countrySlug: string, countryName: string): LandingConversionCopy {
  const key = countrySlug.replace(/-safaris$/, '').toLowerCase();
  return DEFAULTS[key] || fallbackCopy(countryName);
}

export function landingVisibleH1(countrySlug: string, countryName: string, cmsHeadline = ''): string {
  const copy = landingConversionCopy(countrySlug, countryName);
  const cms = cmsHeadline.trim();
  if (!cms) return copy.h1;
  const generic = new Set(
    [
      countryName,
      `${countryName} safaris`,
      `${countryName} safari`,
      `best safari in ${countryName}`,
      `best safaris in ${countryName}`,
      `best safaris in ${countryName}.`,
    ].map((item) => item.toLowerCase())
  );
  if (generic.has(cms.toLowerCase())) return copy.h1;
  return cms;
}

export const LANDING_READY_IMAGES = [
  SITE_MEDIA.elephantSunset,
  SITE_MEDIA.wildlifeNationalPark,
  SITE_MEDIA.gorillasForest,
];
