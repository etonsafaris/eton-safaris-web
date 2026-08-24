export type CountryPlanning = {
  bestTime: string;
  typicalStay: string;
  bookAhead: string;
  signature: string;
};

const PLANNING: Record<string, CountryPlanning> = {
  uganda: {
    bestTime: 'June–September and December–February',
    typicalStay: '4–12 days',
    bookAhead: 'Gorilla permits 3–6 months before peak months',
    signature: 'Bwindi and Mgahinga mountain gorilla treks',
  },
  kenya: {
    bestTime: 'July–October for the Mara migration; year-round Big Five',
    typicalStay: '5–10 days',
    bookAhead: 'Migration camps 4–8 months ahead',
    signature: 'Masai Mara game drives and Amboseli elephant country',
  },
  tanzania: {
    bestTime: 'June–October dry season; January–March calving in the south',
    typicalStay: '6–14 days',
    bookAhead: 'Serengeti and Ngorongoro lodges in high season',
    signature: 'Serengeti, Ngorongoro Crater, and Zanzibar beaches',
  },
  rwanda: {
    bestTime: 'June–September and December–February',
    typicalStay: '3–8 days',
    bookAhead: 'Volcanoes gorilla permits as soon as dates are firm',
    signature: 'Volcanoes National Park gorillas and golden monkeys',
  },
  botswana: {
    bestTime: 'May–October dry season in the Okavango and Chobe',
    typicalStay: '6–12 days',
    bookAhead: 'Okavango camps 6–12 months ahead',
    signature: 'Okavango Delta waterways and Chobe river elephants',
  },
  egypt: {
    bestTime: 'October–April for Nile and desert travel',
    typicalStay: '7–12 days',
    bookAhead: 'Nile cruises and popular tombs in winter',
    signature: 'Nile cruises, Luxor temples, and Red Sea add-ons',
  },
  namibia: {
    bestTime: 'May–October for Etosha and desert wildlife',
    typicalStay: '8–14 days',
    bookAhead: 'Sossusvlei and Skeleton Coast lodges in dry months',
    signature: 'Sossusvlei dunes, Etosha, and desert-adapted wildlife',
  },
  'south-africa': {
    bestTime: 'May–September for Kruger; November–March for the Garden Route',
    typicalStay: '7–14 days',
    bookAhead: 'Kruger lodges for safari school holidays',
    signature: 'Kruger Big Five and Cape Town coast',
  },
  'dr-congo': {
    bestTime: 'June–August and December–February when parks are open',
    typicalStay: '4–8 days',
    bookAhead: 'Virunga gorilla and Nyiragongo permits with current access checks',
    signature: 'Virunga gorillas and Nyiragongo volcano hikes',
  },
  ethiopia: {
    bestTime: 'October–March after the main rains',
    typicalStay: '8–14 days',
    bookAhead: 'Simien and Lalibela lodges in festival periods',
    signature: 'Simien Mountains, Lalibela, and Rift Valley lakes',
  },
  malawi: {
    bestTime: 'May–October for parks and lake weather',
    typicalStay: '6–10 days',
    bookAhead: 'Lake Malawi lodges for July–August',
    signature: 'Liwonde wildlife and Lake Malawi beaches',
  },
  zambia: {
    bestTime: 'June–October for South Luangwa walking safaris',
    typicalStay: '6–12 days',
    bookAhead: 'Luangwa and Victoria Falls lodges in dry season',
    signature: 'South Luangwa walking safaris and Victoria Falls',
  },
};

export function countryPlanning(slug: string, countryName: string): CountryPlanning {
  return (
    PLANNING[slug] || {
      bestTime: 'Year-round, with drier months usually offering easier game viewing',
      typicalStay: '5–10 days',
      bookAhead: 'Popular lodges 3–6 months ahead',
      signature: `${countryName} wildlife, landscapes, and local culture`,
    }
  );
}

export function bestTimeToVisit(slug: string, countryName: string, stored?: string) {
  const value = String(stored || '').trim();
  return value || countryPlanning(slug, countryName).bestTime;
}

export function bestTimeForCountryLabel(countryName: string, stored?: string) {
  const name = String(countryName || '').trim();
  if (!name) return '';
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/-safaris$/, '');
  return bestTimeToVisit(slug, name, stored);
}

export function gorillaPermitHowTo(countryName: string) {
  return {
    '@type': 'HowTo',
    name: `How to book a ${countryName} gorilla trekking safari with Eton Safaris`,
    description: `Reserve gorilla permits, choose trekking dates, and travel with a licensed Uganda-based operator.`,
    totalTime: 'P4D',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Share your dates and group size',
        text: `Tell Eton Safaris your preferred month, number of trekkers, and whether you want a private or small-group safari in ${countryName}.`,
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Secure gorilla permits',
        text: 'We reserve official gorilla permits against your confirmed dates. Permits are limited, so peak months should be booked early.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Match lodges and transport',
        text: 'Stay near the trekking sector and travel in a private 4x4 with a local guide, with optional chimps, parks, or beach add-ons.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Trek with a briefed guide',
        text: 'On the trek day your guide handles park check-in, briefing, and the forest walk so you can focus on the gorilla family encounter.',
      },
    ],
  };
}
