import { NAV_COUNTRIES, OTHER_DESTINATIONS, SITE } from '@/lib/collections';
import { COUNTRY_ARTICLE_HTML, COUNTRY_HERO_TITLES } from '@/lib/country-landing-copy';
import { ABOUT_DESTINATION_CHIPS } from '@/lib/destination-chips';
import { landingSlugForCountry } from '@/lib/cms-routes';
import type { CmsPageLayout, PageFaq } from '@/lib/cms-page-model';
import { COMMUNITY_INITIATIVES } from '@/lib/community-initiatives';
import { DEFAULT_HOME_PAGE_CONTENT, HOME_PAGE_SLUG } from '@/lib/home-page-content';
import { SITE_MEDIA } from '@/lib/site-media';
import { LANDING_PAGE_DEFAULTS, STATIC_PAGES } from '@/lib/static-pages';

export type DefaultCmsPage = {
  title: string;
  slug: string;
  layout: CmsPageLayout;
  image_url: string;
  video_url?: string;
  hero_title?: string;
  subtitle?: string;
  excerpt: string;
  content: string;
  destinations?: string[];
  faqs: PageFaq[];
  seo_title: string;
  meta_description: string;
  focus_keyphrase: string;
  schema_type: string;
  breadcrumb_title: string;
  blocks?: { title: string; description: string; image_url?: string; caption?: string }[];
};

export type DefaultLandingPage = {
  title: string;
  slug: string;
  country: string;
  headline: string;
  excerpt: string;
  content: string;
  image_url: string;
  faqs: PageFaq[];
  seo_title: string;
  meta_description: string;
  focus_keyphrase: string;
};

const BRAND_TITLE_SUFFIX = `${SITE.name}, Tour, Travel, Hotel Booking, Uganda`;

function seoTitle(pageTitle: string) {
  return `${pageTitle} - ${BRAND_TITLE_SUFFIX}`;
}

const ABOUT_WHO = `<p>Eton Safaris was established by native professionals in Uganda after gathering the skills and experience to run safaris and holidays. Our idea is to offer tours and travel services to guests throughout East Africa. Eton Safaris is a fully legally licensed company with operational offices in Wakiso, Uganda. We offer a variety of services ranging from tours and travel, hotel booking, chimpanzee and gorilla trekking safaris, beach holidays, flight tickets, and transport — majorly in Uganda, Kenya, Tanzania, Zanzibar, and Rwanda.</p>`;

const ABOUT_WHAT = `<p>Tours and Travel Agency based in Uganda rendering mountain gorilla trekking, birding, and wildlife safaris doubled with mountaineering, white water rafting, and culture and community tours across Uganda and East Africa. We pride ourselves in convenient safaris based on guest requests for budget, time, and travel needs.</p>
<p>Mountain gorilla trekking in Uganda and Rwanda, wildebeest migration in Tanzania and Kenya, Rwenzori and Kilimanjaro hiking, and white water rafting on the Nile. Our safari guides and mechanically sound fleet make the journey a lifetime experience. Services run year-round, with the best windows December to January and June to August.</p>
<p><strong>Outbound travels</strong>: Our team also offers outbound travel — flight tickets, overseas hotel booking, and safaris in Europe, Asia, the Middle East, and North America — plus travel advisory.</p>
<p>Give back to the community. Be part of our help-the-needy campaign by booking your safari with us or donating directly. We partner with community programmes supporting orphans, children from impoverished families, and street children with safer education. Community outreach also works with older people and HIV/AIDS women groups on food, clothing, and shelter.</p>
<p>Eton Safaris partners with accommodation countrywide at every level: bed space, tented camps, homestays, lodges, cottages, hotels, and motels for budget, mid-range, and luxury guests.</p>`;

export const DEFAULT_CMS_PAGES: DefaultCmsPage[] = [
  {
    title: 'Home Page',
    slug: HOME_PAGE_SLUG,
    layout: 'home',
    image_url: SITE_MEDIA.safariVehicle,
    video_url: '',
    hero_title: 'Home Page',
    subtitle: '',
    excerpt: DEFAULT_HOME_PAGE_CONTENT.footerAbout.slice(0, 220),
    content: `<p>${DEFAULT_HOME_PAGE_CONTENT.footerAbout}</p>`,
    faqs: [],
    seo_title: seoTitle('Home Page'),
    meta_description: DEFAULT_HOME_PAGE_CONTENT.footerAbout.slice(0, 155),
    focus_keyphrase: 'Eton Safaris home page',
    schema_type: 'WebPage',
    breadcrumb_title: 'Home Page',
    blocks: [],
  },
  {
    title: 'About Us',
    slug: 'about-us',
    layout: 'about',
    image_url: SITE_MEDIA.safariVehicle,
    video_url: SITE_MEDIA.gorillaVideo,
    hero_title: 'About Us',
    excerpt:
      'Eton Safaris is a Uganda-based tours and travel agency for gorilla trekking, wildlife safaris, and tailor-made holidays across East Africa.',
    content: `<h4>Who We are</h4>${ABOUT_WHO}<h4>What We do</h4>${ABOUT_WHAT}`,
    destinations: ABOUT_DESTINATION_CHIPS,
    faqs: [
      {
        question: 'Where is Eton Safaris based?',
        answer:
          'Eton Safaris is a licensed tours and travel company based in Wakiso District, Uganda, operating safaris across East Africa and selected destinations beyond.',
      },
      {
        question: 'Which countries can Eton Safaris arrange?',
        answer:
          'Core itineraries cover Uganda, Kenya, Tanzania, and Rwanda, with further African destinations including Botswana, Namibia, Zambia, Malawi, South Africa, Egypt, and more.',
      },
      {
        question: 'When is the best time for an East Africa safari?',
        answer:
          'Safaris run year-round. Peak wildlife and trekking windows are typically December to January and June to August, depending on the park and activity.',
      },
      {
        question: 'Do you tailor itineraries to a budget?',
        answer:
          'Yes. We design gorilla trekking, wildlife, birding, hiking, and community tours for budget, mid-range, and luxury travellers.',
      },
    ],
    seo_title: seoTitle('About Us'),
    meta_description:
      'About Eton Safaris — a licensed Uganda tours and travel agency for gorilla trekking, wildlife safaris, hotel booking, and tailor-made East Africa holidays.',
    focus_keyphrase: 'Eton Safaris about us',
    schema_type: 'AboutPage',
    breadcrumb_title: 'About Us',
    blocks: [
      {
        title: 'Who We are',
        description: ABOUT_WHO,
        image_url: SITE_MEDIA.gorillasForest,
      },
      {
        title: 'What We do',
        description: ABOUT_WHAT,
        image_url: SITE_MEDIA.wildlifeNationalPark,
      },
    ],
  },
  {
    title: 'Terms of Services',
    slug: 'terms-of-services',
    layout: 'policy',
    image_url: SITE_MEDIA.safariVehicle,
    excerpt: 'Booking, payment, cancellation, and liability terms for travelling with Eton Safaris.',
    content: STATIC_PAGES['terms-of-services'].content,
    faqs: [
      {
        question: 'When is full safari payment due?',
        answer:
          'A deposit is required at booking (including gorilla or chimpanzee permits). Full payment is due at least one month before departure unless otherwise agreed.',
      },
      {
        question: 'Are gorilla permits refundable?',
        answer: 'Gorilla permits and flight tickets are 100% non-refundable, even when other cancellation percentages apply.',
      },
    ],
    seo_title: seoTitle('Terms of Services'),
    meta_description:
      'Read Eton Safaris terms of services covering bookings, payments, cancellations, vehicles, insurance, and liability for African safari tours.',
    focus_keyphrase: 'Eton Safaris terms of services',
    schema_type: 'WebPage',
    breadcrumb_title: 'Terms of Services',
  },
  {
    title: 'Privacy Policies',
    slug: 'privacy-policies',
    layout: 'policy',
    image_url: SITE_MEDIA.safariVehicle,
    excerpt: 'How Eton Safaris collects, uses, and protects personal information when you plan or travel with us.',
    content: STATIC_PAGES['privacy-policies'].content,
    faqs: [
      {
        question: 'What personal data does Eton Safaris collect?',
        answer:
          'We collect contact details, email, and — when you travel — passport and relevant health information so we can arrange your safari correctly.',
      },
      {
        question: 'How can I ask about my data?',
        answer: `Email ${SITE.email} at any time with questions, requests, or complaints about our privacy policy.`,
      },
    ],
    seo_title: seoTitle('Privacy Policies'),
    meta_description:
      'Eton Safaris privacy policy: how we collect, share, and safeguard personal information for safari bookings and website use.',
    focus_keyphrase: 'Eton Safaris privacy policy',
    schema_type: 'WebPage',
    breadcrumb_title: 'Privacy Policies',
  },
  {
    title: 'Tours and Travel Agency',
    slug: 'tours-and-travel-agency',
    layout: 'agency',
    image_url: SITE_MEDIA.wildlifeNationalPark,
    hero_title: 'Tours and Travel Agency',
    excerpt:
      'Eton Safaris is a Uganda tours and travel agency for gorilla trekking, wildlife, birding, hotel booking, and tailor-made East Africa itineraries.',
    content: `<h4>Uganda tours and travel agency</h4>
<p>Eton Safaris is a tours and travel agency based in Uganda, arranging mountain gorilla trekking, chimpanzee tracking, birding, wildlife safaris, mountaineering, white water rafting, and culture and community tours across East Africa.</p>
<p>We design tailor-made itineraries for every budget — budget, mid-range, and luxury — with experienced native guides and a maintained safari fleet. Services include hotel booking, park permits, ground transport, and flight ticket support.</p>
<h4>What we book</h4>
<p>Gorilla and chimpanzee permits in Uganda and Rwanda, wildebeest migration safaris in Kenya and Tanzania, Rwenzori and Kilimanjaro hiking, Nile rafting, beach add-ons, and lodge or tented-camp stays.</p>
<p>Speak with the team through Talk to Us for a quotation, or browse live tour packages published from our operations desk.</p>`,
    destinations: ABOUT_DESTINATION_CHIPS,
    faqs: [
      {
        question: 'Is Eton Safaris a licensed travel agency?',
        answer:
          'Yes. Eton Safaris is a legally licensed tours and travel company operating from Uganda with itineraries across East Africa.',
      },
      {
        question: 'Can the agency book hotels and flights?',
        answer:
          'We arrange lodges, tented camps, and hotels to match your budget, and can support flight tickets and outbound travel advisory.',
      },
    ],
    seo_title: seoTitle('Tours and Travel Agency'),
    meta_description:
      'Eton Safaris tours and travel agency in Uganda — gorilla trekking, wildlife safaris, hotel booking, and tailor-made East Africa holiday planning.',
    focus_keyphrase: 'Uganda tours and travel agency',
    schema_type: 'WebPage',
    breadcrumb_title: 'Travel Agency',
    blocks: [
      {
        title: 'Uganda tours and travel agency',
        description:
          '<p>Eton Safaris is a tours and travel agency based in Uganda, arranging mountain gorilla trekking, chimpanzee tracking, birding, wildlife safaris, mountaineering, white water rafting, and culture and community tours across East Africa.</p><p>We design tailor-made itineraries for every budget with experienced native guides and a maintained safari fleet.</p>',
        image_url: SITE_MEDIA.gorillasForest,
      },
      {
        title: 'What we book',
        description:
          '<p>Gorilla and chimpanzee permits in Uganda and Rwanda, wildebeest migration safaris in Kenya and Tanzania, Rwenzori and Kilimanjaro hiking, Nile rafting, beach add-ons, and lodge or tented-camp stays.</p>',
        image_url: SITE_MEDIA.wildlifeNationalPark,
      },
    ],
  },
  {
    title: 'Community Support',
    slug: 'community-support',
    layout: 'community',
    image_url: SITE_MEDIA.communityHero,
    hero_title: 'Our Community',
    subtitle: 'Where luxury travel meets lasting impact',
    excerpt:
      'Eton Safaris supports community-based tourism, education, conservation, and local employment across East Africa.',
    content: `<p>Every journey with Eton Safaris creates lasting impact. Through partnerships with local villages, conservation initiatives, and education programmes across East Africa, your adventure empowers communities and preserves the wild for generations to come.</p>`,
    faqs: [
      {
        question: 'How does booking a safari support communities?',
        answer:
          'A portion of safari bookings supports local schools, community visits, conservation partners, and fair local employment for guides, drivers, and camp teams.',
      },
      {
        question: 'Can I add a community visit to my itinerary?',
        answer:
          'Yes. Ask our consultants to include a community-based tourism experience when you request a quotation.',
      },
    ],
    seo_title: seoTitle('Community Support'),
    meta_description:
      'Eton Safaris community support: community-based tourism, education, conservation, and local employment across Uganda, Kenya, Tanzania, and Rwanda.',
    focus_keyphrase: 'Eton Safaris community support',
    schema_type: 'WebPage',
    breadcrumb_title: 'Community Support',
    blocks: COMMUNITY_INITIATIVES,
  },
  {
    title: 'Contact Us',
    slug: 'contact-us',
    layout: 'standard',
    image_url: SITE_MEDIA.talkToUsHero,
    excerpt: `Reach Eton Safaris by phone, WhatsApp, or email. ${SITE.phoneDisplay} · ${SITE.email}`,
    content: `<p>Reach Eton Safaris by phone, WhatsApp, or email. Use Talk to Us on the website header to send an inquiry.</p>
<p>Phone: ${SITE.phoneDisplay}<br/>Email: ${SITE.email}<br/>Address: ${SITE.address}</p>`,
    faqs: [
      {
        question: 'How do I request a safari quotation?',
        answer:
          'Use the contact form, WhatsApp, or Talk to Us. Share your travel dates, group size, and preferred destinations so we can tailor an itinerary.',
      },
    ],
    seo_title: seoTitle('Contact Us'),
    meta_description: `Contact Eton Safaris in Uganda for gorilla trekking and wildlife safari quotations. Phone ${SITE.phoneDisplay}, email ${SITE.email}.`,
    focus_keyphrase: 'contact Eton Safaris',
    schema_type: 'WebPage',
    breadcrumb_title: 'Contact Us',
  },
];

const CORE_LANDING_FAQS: Record<string, PageFaq[]> = {
  uganda: [
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
  kenya: [
    {
      question: 'When is the Great Migration in Kenya?',
      answer:
        'Wildebeest typically reach the Masai Mara from late June through October, with river crossings most likely in the dry season.',
    },
    {
      question: 'Can I combine a Kenya safari with the beach?',
      answer:
        'Yes. Many travellers add Mombasa or Diani after Masai Mara, Amboseli, or Tsavo.',
    },
  ],
  tanzania: [
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
  rwanda: [
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
};

const EXTRA_LANDING_COPY: Record<string, { headline: string; excerpt: string; content: string; image: string; faqs: PageFaq[] }> = {
  botswana: {
    headline: 'Botswana Safari Tours',
    excerpt: 'Okavango Delta waterways, Chobe elephants, and exclusive wildlife viewing in Botswana.',
    content:
      '<p>Botswana safari tours focus on the Okavango Delta, Chobe National Park, and the Kalahari — boat safaris, game drives, and low-impact camps in one of Africa’s premier wildlife countries.</p>',
    image: SITE_MEDIA.wildlifeNationalPark,
    faqs: [
      {
        question: 'What is Botswana known for on safari?',
        answer: 'The Okavango Delta, Chobe elephants, and high-quality game viewing in a conservation-led tourism model.',
      },
    ],
  },
  egypt: {
    headline: 'Egypt Tours and Nile Journeys',
    excerpt: 'Pyramids, Nile cruises, and Red Sea extensions arranged alongside African safari itineraries.',
    content:
      '<p>Egypt tours pair the Pyramids of Giza, Luxor temples, and Nile cruises with optional Red Sea rest days. Eton Safaris plans outbound cultural journeys as part of a wider Africa itinerary.</p>',
    image: SITE_MEDIA.safariVehicle,
    faqs: [
      {
        question: 'Can Egypt be combined with an East Africa safari?',
        answer: 'Yes. Many travellers add Cairo or a Nile cruise before or after gorilla trekking and wildlife parks.',
      },
    ],
  },
  namibia: {
    headline: 'Namibia Safari Tours',
    excerpt: 'Namib dunes, desert-adapted wildlife, and Etosha National Park on a Namibia safari.',
    content:
      '<p>Namibia safari tours cover Sossusvlei dunes, desert-adapted wildlife, the Skeleton Coast, and Etosha National Park — landscapes that contrast with East African savanna parks.</p>',
    image: SITE_MEDIA.wildlifeNationalPark,
    faqs: [
      {
        question: 'Is Namibia a wildlife or landscape safari?',
        answer: 'Both. Etosha delivers classic game viewing while the Namib and Skeleton Coast are world-class landscape destinations.',
      },
    ],
  },
  'south-africa': {
    headline: 'South Africa Safari Tours',
    excerpt: 'Kruger, Cape Town, and garden-route journeys on South Africa safari tours.',
    content:
      '<p>South Africa safari tours combine Kruger and private reserves with Cape Town, wine country, and the Garden Route — Big Five viewing plus city and coast.</p>',
    image: SITE_MEDIA.wildlifeNationalPark,
    faqs: [
      {
        question: 'Where is the best safari in South Africa?',
        answer: 'Kruger National Park and neighbouring private reserves offer reliable Big Five viewing, often paired with Cape Town.',
      },
    ],
  },
  'dr-congo': {
    headline: 'DR Congo Gorilla Trekking',
    excerpt: 'Virunga gorilla trekking and volcano landscapes in the Democratic Republic of Congo.',
    content:
      '<p>DR Congo itineraries centre on Virunga National Park gorilla trekking and Nyiragongo landscapes, planned with current security advice and permit availability.</p>',
    image: SITE_MEDIA.gorillasForest,
    faqs: [
      {
        question: 'Can I trek gorillas in DR Congo?',
        answer: 'Virunga offers gorilla trekking when permits and conditions allow. We confirm access and safety before booking.',
      },
    ],
  },
  ethiopia: {
    headline: 'Ethiopia Tours and Cultural Safaris',
    excerpt: 'Simien Mountains, historic north, and cultural routes on Ethiopia tours.',
    content:
      '<p>Ethiopia tours explore the Simien Mountains, Lalibela churches, the historic north, and Rift Valley landscapes — a cultural complement to classic East African wildlife safaris.</p>',
    image: SITE_MEDIA.safariVehicle,
    faqs: [
      {
        question: 'Is Ethiopia a wildlife or cultural destination?',
        answer: 'Primarily cultural and highland landscapes, with unique wildlife in the Simiens and Bale Mountains.',
      },
    ],
  },
  malawi: {
    headline: 'Malawi Safari and Lake Holidays',
    excerpt: 'Lake Malawi beaches with Liwonde and Majete wildlife on a Malawi safari.',
    content:
      '<p>Malawi combines Lake Malawi swimming and snorkelling with Liwonde and Majete game viewing — a compact safari-and-lake holiday in Southern Africa.</p>',
    image: SITE_MEDIA.wildlifeNationalPark,
    faqs: [
      {
        question: 'What is Malawi best known for?',
        answer: 'Lake Malawi, plus recovering wildlife parks such as Liwonde and Majete.',
      },
    ],
  },
  zambia: {
    headline: 'Zambia Safari Tours',
    excerpt: 'South Luangwa walking safaris and Victoria Falls on Zambia safari tours.',
    content:
      '<p>Zambia safari tours are known for South Luangwa walking safaris, the Luangwa River, and Victoria Falls — a classic walking-safari destination.</p>',
    image: SITE_MEDIA.wildlifeNationalPark,
    faqs: [
      {
        question: 'Why choose Zambia for safari?',
        answer: 'South Luangwa is famous for walking safaris and authentic bush camps, often combined with Victoria Falls.',
      },
    ],
  },
};

function coreLanding(slug: keyof typeof COUNTRY_HERO_TITLES, country: string): DefaultLandingPage {
  const fallback = LANDING_PAGE_DEFAULTS[`${slug}-safaris`];
  const headline = COUNTRY_HERO_TITLES[slug];
  const content = COUNTRY_ARTICLE_HTML[slug];
  const excerpt = fallback?.summary || `${country} safari tours with Eton Safaris.`;
  return {
    title: headline,
    slug: `${slug}-safaris`,
    country,
    headline,
    excerpt,
    content,
    image_url: fallback?.image || SITE_MEDIA.wildlifeNationalPark,
    faqs: CORE_LANDING_FAQS[slug] || [],
    seo_title: seoTitle(headline),
    meta_description: excerpt.slice(0, 155),
    focus_keyphrase: `${country} safaris`,
  };
}

export const DEFAULT_LANDING_PAGES: DefaultLandingPage[] = [
  coreLanding('uganda', 'Uganda'),
  coreLanding('kenya', 'Kenya'),
  coreLanding('tanzania', 'Tanzania'),
  coreLanding('rwanda', 'Rwanda'),
  ...OTHER_DESTINATIONS.map((item) => {
    const extra = EXTRA_LANDING_COPY[item.slug];
    const headline = extra?.headline || `${item.name} Safari Tours`;
    return {
      title: headline,
      slug: landingSlugForCountry(item.slug),
      country: item.name,
      headline,
      excerpt: extra?.excerpt || `${item.name} tours and safari holidays planned by Eton Safaris.`,
      content: extra?.content || `<p>${item.name} safari and touring itineraries arranged by Eton Safaris from Uganda.</p>`,
      image_url: extra?.image || SITE_MEDIA.wildlifeNationalPark,
      faqs: extra?.faqs || [],
      seo_title: seoTitle(headline),
      meta_description: (extra?.excerpt || `${item.name} safari tours with Eton Safaris.`).slice(0, 155),
      focus_keyphrase: `${item.name} safaris`,
    } satisfies DefaultLandingPage;
  }),
];

export const ALL_SEEDED_COUNTRIES = [...NAV_COUNTRIES, ...OTHER_DESTINATIONS];
