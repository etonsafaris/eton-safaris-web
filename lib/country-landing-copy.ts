export const COUNTRY_SPECIALISTS_LINE =
  'Our specialists can help you plan your trip, individually focusing on your tastes and interests, to the destinations below.';

export const COUNTRY_HERO_TITLES: Record<string, string> = {
  uganda: 'Uganda Gorilla Trekking Tours & Wildlife Safaris',
  kenya: 'Kenya Safari Tours & Wildlife Holidays',
  tanzania: 'Tanzania Safari Tours, Serengeti & Kilimanjaro',
  rwanda: 'Rwanda Gorilla Trekking Tours & Wildlife Safaris',
};

export const COUNTRY_ARTICLE_HTML: Record<string, string> = {
  uganda: `<h3>Uganda safari tours</h3>
<p>Experience the beauty of this Country through Uganda safari tours, which offer stunning landscapes, diverse wildlife, and rich cultural experiences. Nestled in East Africa, Uganda is renowned for its incredible gorilla safaris, making it a must-visit destination for nature lovers and adventure seekers alike.</p>
<p>One of the main highlights while on Uganda safari tours is the opportunity to encounter the high population of mountain gorillas. With over half of the world's gorilla population residing here, Uganda is rightly known as the "Pearl of Africa." Imagine trekking through lush rainforests, coming face-to-face with these majestic creatures in their natural habitat – an experience that will undoubtedly leave a lasting impression.</p>
<p>Beyond the gorillas on Uganda safari tours, Uganda is home to an astonishing array of wildlife. From lions and elephants in Queen Elizabeth National Park to the magnificent Murchison Falls in Murchison Falls National Park, the country offers an abundance of thrilling safari experiences. Embark on exhilarating game drives, boat cruises, and chimpanzee tracking adventures to witness the rich biodiversity and immerse yourself in the wonders of the African wilderness while on Uganda safari tours.</p>
<p>But Uganda safari tours don't just revolve around wildlife – they also allow for cultural immersion. Visit local communities, interact with welcoming locals, and learn about their traditions and way of life. While picking the Uganda Safari tours, you can explore the scenic landscapes, including the picturesque Lake Victoria and the Albertine Rift forests. Every moment spent in Uganda promises to be a feast for the senses.</p>`,
  kenya: `<p>Kenya Safari Tours, Breathtaking Landscapes, Cultures, and Wildlife. Located in East Africa with a shoreline flanking the Indian Ocean, Kenya encompasses many landscapes savannahs, lakelands, the dramatic Great Rift Valley and mountain highlands too. It is home to the populous thriving animal populations, inclusive of lions, elephants and rhinos mostly viewed to Masai Mara Reserve (recognized for its annual wildebeest migrations) and Amboseli National Park (which gives breathtaking perspectives of Tanzania's 5,895 m Mt. Kilimanjaro).The reality that it straddles the equator with negligible seasonal temperature variance, makes best safari in Kenya the suitable year-spherical vacation spot for a mixture safari-and-seashore holiday. Seen because the sacred land of safari, Kenya has a unique enchantment from July to October. It is presently that the scene is about for one of the world’s maximum epic herbal wonders whilst nearly million wildebeest, zebra and gazelle go away the southern Serengeti, to Masai Mara from overdue June. The Masai Mara, collectively with Amboseli and Tsavo National Parks and the Chyulu Hills, gives notable year-spherical sport viewing inclusive of the legendary ‘Big Five’.</p>`,
  tanzania: `<p>Located in East Africa alongside the nice and cozy waters of the Indian Ocean, Luxury Tanzania safari tours boasts 3 of Africa’s best-recognized lakes – Lake Victoria in the north; Lake Tanganyika in the west; and Lake Nyasa in the south. Tanzania is thought of for its good-sized wilderness area such as the plains of the Serengeti National Park (a safari Mecca populated by the African Big 5 and Kilimanjaro National Park (Africa’s tallest mountain). Tropical islands are any other of Tanzania’s appeals. The island of Mafia has a marine park with whale sharks and coral reefs, which makeit one of all Africa’s most reliable traveler destinations. Known because the Spice Island, the lovely Arabic-stimulated Zanzibar has a wealthy lifestyle and history, coupled with idyllic white seashores hailed as a number of the world’s best.</p>`,
  rwanda: `<p>Rwanda is commonly known as the land of rolling thousand hills, Rwandas picturesque scenery and calm, friendly people offer special experiences. Rwanda is a landlocked country in East Africa sharing the west harm of the Great Rift Valley where the African Great Lakes region lies. With its capital being Kigali, and one of the smallest countries on the African mainland.Rwandas beautiful scenery and warm, friendly communities offer unique adventurous experiences and this makes it one of the best remarkable countries across the world. It is blessed with an extraordinarily wide range of biodiversity, with incredible wildlife species living throughout its volcanoes, montane rainforest, and sweeping savanna plains. Visit Kigali city for a glimpse about the most unique historical experience exhibited at the Kigali genocide memorial, encounter the most exciting endangered species in their natural habitat at Volcanoes National park for Gorillas and Golden monkeys Trekking and gorilla trekking Rwanda, Chimpanzee trekking, and canopy walk experience takes place in Nyungwe Forest National park which is one of the oldest montane rain forest in the tropics region, Akagera National Park is one of the most spectacular savanna parks in African with the highest chances of encountering the big fives. Eton Safaris focus is primarily on the group and private travels. With skill, experience, specialist knowledge, and expertise in creating, costing, advising, and executing travel for guests to Rwanda in a group environment. Our experienced consultants offer all-inclusive itineraries, exclusive added value to this tour and safari destinations.</p>`,
};

export function countryHeroTitle(slug: string, fallbackName: string) {
  return COUNTRY_HERO_TITLES[slug] || `${fallbackName} Safari Tours`;
}

export function countryArticleHtml(slug: string) {
  return stripParkListFromCountryHtml(COUNTRY_ARTICLE_HTML[slug] || '');
}

export function isSubstantialCountryArticle(html: string) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length >= 400;
}

/** Drop the CMS “National Parks in …” directory and park-named heading blocks. */
export function stripParkListFromCountryHtml(html: string) {
  if (!html) return html;
  const embedMatch = html.match(/(\n?<!--ETON_CONTENT:[\s\S]*-->\s*)$/);
  const embed = embedMatch?.[1] || '';
  let body = embed ? html.slice(0, html.length - embed.length) : html;

  body = body.replace(
    /<(?:p|h[1-4])[^>]*>\s*(?:<(?:b|strong)>)?\s*(?:Park List|National Parks in)\b[\s\S]*$/i,
    ''
  );

  const parts = body.split(/(?=<h[1-4]\b)/i);
  body = parts
    .filter((part) => {
      const heading = part.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
      if (!heading) return true;
      const text = heading[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (/safari tours/i.test(text)) return true;
      return !/\b(park list|national park|national reserve|game reserve|conservation area|protected area|wildlife reserve)\b/i.test(
        text
      );
    })
    .join('');

  return `${body.trim()}${embed}`;
}
