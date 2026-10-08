/** Factual, country-specific snippets for keyword articles (no fabricated statistics). */

export const COUNTRY_FACTS = {
  Uganda: {
    label: 'Uganda',
    parks: [
      'Bwindi Impenetrable National Park',
      'Kibale National Park',
      'Murchison Falls National Park',
      'Queen Elizabeth National Park',
      'Lake Mburo National Park',
      'Kidepo Valley National Park',
      'Mgahinga Gorilla National Park',
    ],
    highlights:
      'Uganda is a compact East African destination known for mountain gorilla trekking, chimpanzee tracking, savannah game drives, and the source of the Nile at Jinja.',
    drySeason: 'June to September and December to February often bring drier trails for trekking and game drives.',
    wetSeason: 'March to May and October to November are wetter; forests are lush and birdlife is excellent.',
    currency: 'Uganda shilling (UGX); US dollars are widely accepted on safari bookings with clear pricing in advance.',
    visa: 'Most visitors need an e visa or visa on arrival; check current requirements before travel.',
  },
  Kenya: {
    label: 'Kenya',
    parks: ['Maasai Mara National Reserve', 'Amboseli National Park', 'Lake Nakuru National Park', 'Tsavo East and West', 'Samburu National Reserve'],
    highlights:
      'Kenya combines classic savannah safaris, the Great Rift Valley, and Indian Ocean beaches.',
    drySeason: 'Late June to October is peak for migration viewing in the Mara; January to February is also popular.',
    wetSeason: 'Long rains often peak April to May; short rains around November.',
    currency: 'Kenyan shilling (KES).',
    visa: 'Electronic travel authorisation (eTA) is required for most nationalities. Verify before departure.',
  },
  Tanzania: {
    label: 'Tanzania',
    parks: ['Serengeti National Park', 'Ngorongoro Crater', 'Tarangire National Park', 'Lake Manyara', 'Kilimanjaro National Park', 'Zanzibar beaches'],
    highlights:
      'Tanzania offers Serengeti and Mara ecosystems, Ngorongoro Crater wildlife, Kilimanjaro treks, and Zanzibar coast extensions.',
    drySeason: 'June to October is classic dry season safari weather; migration timing varies by month and region.',
    wetSeason: 'April to May can be wet in many parks; green season safaris suit birders and photographers.',
    currency: 'Tanzanian shilling (TZS).',
    visa: 'Most visitors obtain a visa or e visa in advance. Confirm current rules for your passport.',
  },
  Rwanda: {
    label: 'Rwanda',
    parks: ['Volcanoes National Park', 'Nyungwe Forest National Park', 'Akagera National Park'],
    highlights:
      'Rwanda is known for mountain gorillas in Volcanoes National Park, Nyungwe chimpanzees, and savannah wildlife in Akagera.',
    drySeason: 'June to September and December to February are popular trekking seasons.',
    wetSeason: 'March to May and October to November bring more rain in the forests.',
    currency: 'Rwandan franc (RWF).',
    visa: 'Visa on arrival or e visa is available for many nationalities. Check official guidance.',
  },
};

export function factsForCountry(countryName) {
  const key = Object.keys(COUNTRY_FACTS).find((k) => k.toLowerCase() === String(countryName || '').toLowerCase());
  return (
    COUNTRY_FACTS[key || ''] || {
      label: countryName || 'Africa',
      parks: ['national parks and reserves'],
      highlights: `${countryName} offers guided safaris, lodges, and wildlife experiences with licensed operators.`,
      drySeason: 'Dry seasons vary by region. Confirm dates with your safari planner.',
      wetSeason: 'Wet seasons bring greener landscapes and strong birding.',
      currency: 'Local currency and USD are commonly quoted on safari invoices.',
      visa: 'Check visa rules for your nationality before booking flights.',
    }
  );
}
