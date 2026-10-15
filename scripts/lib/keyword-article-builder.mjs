import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

const SITE_BASE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.etonsafaris.com').replace(/\/$/, '');

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed) {
  let s = hashString(String(seed)) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

function shuffle(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function titleCase(phrase) {
  return String(phrase || '')
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

/** Visible prose only. URLs keep their hyphens. */
export function stripHyphens(text) {
  return String(text || '')
    .replace(/[—–]/g, ', ')
    .replace(/(\w)-(\w)/g, '$1 $2')
    .replace(/\s+,/g, ',')
    .replace(/,{2,}/g, ',')
    .replace(/[ \t]{2,}/g, ' ');
}

const TITLE_PATTERNS = [
  '{Keyword}: A Practical {Country} Planning Guide',
  'How to Plan {Keyword} Without a Rushed Week',
  '{Keyword} in {Country}: What the Trip Really Involves',
  'Before You Book {Keyword}: Timing, Parks, and Pace',
  'An Honest Field Note on {Keyword} for {Category}',
  '{Keyword}: Seasons, Lodges, and How to Read a Quote',
  'Planning {Keyword} Around Real Days in {Country}',
  'What First Time Guests Should Know About {Keyword}',
  '{Keyword} for Travellers Who Want Time at the Park',
  'Choosing the Right Month and Route for {Keyword}',
  '{Keyword}: Permits, Fees, and a Calm Itinerary',
  'Making Sense of {Keyword} Before You Leave Home',
  '{Keyword} With Enough Rest for {Country} Roads',
  'A Clear Look at {Keyword} Under {Category}',
  '{Keyword}: Where to Sleep, When to Go, What to Ask',
  'Building a {Keyword} Trip That Matches Your Energy',
  '{Keyword} Explained for Private and Small Group Travel',
  'The Useful Details Behind {Keyword} in {Country}',
  '{Keyword}: From the Airport to the First Game Drive',
  'How Families and Couples Approach {Keyword}',
];

function uniqueDocumentTitle(keyword, usedTitles, ctx, rng) {
  const start = Math.floor(rng() * TITLE_PATTERNS.length);
  let title = '';
  for (let step = 0; step < TITLE_PATTERNS.length; step += 1) {
    const pattern = TITLE_PATTERNS[(start + step) % TITLE_PATTERNS.length];
    title = stripHyphens(fill(pattern, { ...ctx, Keyword: titleCase(keyword), keyword }));
    if (!usedTitles.has(title.toLowerCase())) break;
  }
  if (usedTitles.has(title.toLowerCase())) {
    const extras = ['Field Notes', 'Traveller Brief', 'Park by Park', 'Month by Month', 'On the Ground'];
    title = stripHyphens(`${titleCase(keyword)}: ${extras[Math.floor(rng() * extras.length)]} in ${ctx.country}`);
  let n = 2;
  while (usedTitles.has(title.toLowerCase())) {
      title = stripHyphens(`${titleCase(keyword)}: ${extras[n % extras.length]} ${n} for ${ctx.country}`);
    n += 1;
    }
  }
  usedTitles.add(title.toLowerCase());
  return title;
}

function pickRelatedKeywords(allKeywords, mainKeyword, seed) {
  const main = mainKeyword.toLowerCase();
  const pool = allKeywords.filter((k) => k.toLowerCase() !== main);
  if (pool.length < 2) return pool.length ? [...pool, ...pool].slice(0, 2) : [mainKeyword, mainKeyword];
  const h = hashString(seed);
  const i1 = h % pool.length;
  const i2 = (h * 7 + 13) % pool.length;
  const i3 = i2 === i1 ? (i2 + 1) % pool.length : i2;
  return [pool[i1], pool[i3]];
}

function pickTours(tours, seed, count = 5) {
  if (!tours.length) return [];
  const h = hashString(seed);
  const out = [];
  for (let i = 0; i < Math.min(count, tours.length); i += 1) {
    out.push(tours[(h + i * 11) % tours.length]);
  }
  return out;
}

function tourUrl(slug) {
  return `${SITE_BASE}/tours/${encodeURIComponent(slug)}`;
}

function paragraphFromParts(parts, spacingAfter = 200) {
  const children = [];
  for (const part of parts) {
    const text = part.link ? part.text : stripHyphens(part.text);
    if (part.link) {
      children.push(
        new ExternalHyperlink({
          link: part.url,
          children: [new TextRun({ text, style: 'Hyperlink', size: 22 })],
        })
      );
    } else {
      children.push(new TextRun({ text, size: 22 }));
    }
  }
  return new Paragraph({ children, spacing: { after: spacingAfter } });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    text: stripHyphens(text).trim(),
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 0 : 280, after: 160 },
  });
}

function fill(template, ctx) {
  return stripHyphens(
    template
      .replaceAll('{keyword}', ctx.Keyword)
      .replaceAll('{Keyword}', ctx.Keyword)
      .replaceAll('{country}', ctx.country)
      .replaceAll('{park}', ctx.park)
      .replaceAll('{park2}', ctx.park2)
      .replaceAll('{category}', ctx.category)
      .replaceAll('{dry}', ctx.dry)
      .replaceAll('{wet}', ctx.wet)
      .replaceAll('{currency}', ctx.currency)
      .replaceAll('{visa}', ctx.visa)
      .replaceAll('{highlight}', ctx.highlight)
  );
}

const META_TEMPLATES = [
  'Searchers looking up {keyword} usually need a straight answer on timing, permits, and what a realistic {country} itinerary actually includes. This note stays with those practical details for {category}.',
  'If {keyword} is on your shortlist, the useful questions are lead time, where you sleep near {park}, and which days are spent in the vehicle. Here is a plain account for {country}.',
  '{keyword} sits in the {category} search set for {country}. Expect guidance on {park}, typical pacing, and how quotes should spell out fees before you pay a deposit.',
  'People book {keyword} when they want {country} without a rushed loop. The notes below cover {park}, weather windows, and how to read a day plan.',
  'A clear brief on {keyword}: which part of {country} it belongs to, why {park} comes up so often, and what to confirm in writing under {category}.',
  'Before you price {keyword}, know the season, the park fees, and whether {park} needs a permit months ahead. That is the scope of this {country} page.',
  '{keyword} is less about slogans and more about roads, rest, and ranger rules in {country}. Use this as a planning sheet for {category}, centred on {park}.',
  'Travellers comparing {keyword} packages should look at nights near {park}, included meals, and transfer length. This {country} outline is written for that comparison.',
  'For {keyword}, the decision is usually when to go and how many parks to stack. {dry} Read this alongside any quote for {category} in {country}.',
  'This page answers what {keyword} tends to include in {country}, which habitats you meet around {park}, and how {category} trips are normally paced.',
  'Quotes for {keyword} should name lodges, vehicle type, and park time. If they do not, ask. The rest of this note explains the {country} context around {park}.',
  '{keyword} rewards a slower plan. {country} is compact in some regions and long in others, so {park} may need its own block of days rather than a fly by stop.',
  'Use this as a field note for {keyword}: {highlight} The practical angle is permits, packing, and honest drive times for {category}.',
  'When friends ask what {keyword} feels like, the honest reply is dust or mud, early starts, and a guide who knows {park}. This write up keeps that tone for {country}.',
  '{keyword} planning starts with your month. {wet} Pair that with lodge location and you will understand most {country} quotes in {category}.',
  'Nothing here is copied from a brochure. {keyword} in {country} means real park rules at {park}, real fees, and a pace you can actually keep.',
];

const INTRO_TEMPLATES = [
  'Sit with a map of {country} for a minute before you open another tab of prices. {keyword} only makes sense once you see how far {park} sits from the airport and from {park2}. Most people underestimate that gap, then try to fix it by adding parks. A better fix is fewer beds and longer mornings.',
  'The night before a {country} departure is usually quiet and slightly nervous. Bags are lighter than you expect. The confirmation for {keyword} is either in your email or it is not, and that single detail decides whether the week feels calm. Start there, then worry about binoculars.',
  'I keep hearing the same worry from first time visitors: will {keyword} feel like a checklist. It does if the plan hops from {park} to {park2} with no idle afternoon. It does not if you leave one morning unscheduled and let the guide choose the loop.',
  'Forget the highlight reel for a moment. On the ground, {keyword} is coffee before dawn, a slow drive, and someone explaining tracks in the dust near {park}. {country} does that well when the itinerary respects fatigue, especially on {category} trips with children or older parents.',
  'There is a version of {keyword} that looks cheap because it skips rest and piles on park gates. There is another version that costs more because the lodge at {park} is close to the activity and the vehicle is private. The second one is the one people remember kindly.',
  'If you have already travelled in {country}, you know the rhythm. If you have not, {keyword} will teach it quickly: animals set the clock, not the hotel breakfast buffet. Around {park}, that can mean a very early call and a long, happy return for lunch.',
  'A good planner will ask what you want from {keyword} before they name lodges. Birds, big cats, primates, walking, or simply quiet. {park} and {park2} answer those wishes differently, and {category} in {country} should follow your answer, not a standard circuit.',
  'Write down the month you can actually travel. Then read {dry} Hold that next to {wet} Only after that should you judge a {keyword} quote. Season changes the roads into {park} more than any marketing line will admit.',
  'Families handling {keyword} need shorter game drives and a lodge that tolerates noise. Couples often want the opposite: fewer vehicles in view and dinner outside. Say which you are. {country} can do both, but not in the same room at {park}.',
  'Permits, if this trip needs them, are not a footnote. For {keyword}, ask who holds the permit, which date it is for, and what happens if your flight slips. {park} does not care that your connection was late. Build a buffer into {country}.',
  'Photography on {keyword} goes better when you accept that some sightings are distant. A guide who will not crowd animals at {park} is worth more than a longer lens. Mention that preference when you enquire about {category}.',
  'Money talk, briefly, because it avoids later friction. {currency} {visa} Put both in the same folder as your {keyword} quote so the {country} portion does not surprise you at the airport.',
  'The pleasure of {keyword} is repetition. The second morning at {park} is often better than the first because you recognise the light and the guide knows what you already saw. One night itineraries fight that pleasure. Ask for time.',
  'You do not need to love every park in {country} to enjoy {keyword}. Pick {park} for the thing you came for, and treat {park2} as optional. Travellers who try to see everything in one week come home tired and vague.',
  'Local staff carry these trips. When you book {keyword}, ask whether guides and camp teams are employed locally around {park}. That question tells you more about a {category} company than a page of adjectives.',
  'Rain is not a failure. In {country}, wet months turn {park} green and bring birds that dry months hide. If your only window for {keyword} is rainy, go anyway, pack a jacket, and let the plan stay flexible.',
];

const SECTION_TITLES = [
  'How a normal day tends to run',
  'Where the fee actually goes',
  'Roads, flights, and honest transfer times',
  'Who enjoys this pace, and who should change it',
  'Lodges, camps, and how close they sit to the gate',
  'What guides will and will not promise',
  'Walking, driving, and boat time',
  'Health, altitude, and early mornings',
  'Photography without pressing the animals',
  'Food, water, and dietary notes',
  'Travelling with children or older relatives',
  'Combining a second park without rushing',
  'What the wet months change',
  'What the dry months change',
  'Reading a quote before you pay',
  'Packing that matches the habitat',
  'Community visits and market stops',
  'Rest days that are not wasted days',
];

const OPENERS = [
  'On {keyword}, the useful detail is rarely the slogan.',
  'Guests who enjoy {keyword} usually slow down around {park}.',
  'A fair plan for {keyword} in {country} leaves margin for weather.',
  'Ask your operator to show the {keyword} route on a map, not only in a list.',
  'The first question about {keyword} should be how many hours you sit in a vehicle.',
  'Near {park}, {keyword} feels different from a city hotel stay.',
  'If {keyword} is your main reason for visiting {country}, protect those days.',
  'People regret {keyword} trips when the schedule is prouder than their energy.',
  'A private vehicle changes {keyword} more than a fancier room does.',
  'Write the park fees for {keyword} on the same page as the lodge rate.',
  'Children do well on {keyword} when the midday break is real.',
  'Couples often prefer fewer sightings and more quiet on {keyword}.',
  'Solo travellers should ask how shared departures work for {keyword}.',
  'Birders planning {keyword} may want the greener months on purpose.',
  'Photographers on {keyword} should say if they mind other vehicles.',
  'Walkers need a different kit from game drive guests on {keyword}.',
  'Boat time, when it is offered with {keyword}, is not a substitute for a rest morning.',
  'Altitude around some {country} parks surprises people on {keyword}.',
  'Malaria precautions belong in the {keyword} checklist beside your passport.',
  'Tipping culture varies. Ask for a written note with your {keyword} voucher.',
  'Wi Fi at camps is a bonus, not a plan, on most {keyword} nights.',
  'Laundry turns around slowly. Pack one extra layer for {keyword}.',
  'Neutral colours photograph better and bother wildlife less on {keyword}.',
  'Flash is a poor idea near primates. Say so if {keyword} includes a trek.',
  'Your guide should be allowed to skip a crowd at {park} during {keyword}.',
];

const MIDDLES = [
  'That usually means naming the sector of {park}, not only the park title, on the {category} confirmation.',
  '{dry}',
  '{wet}',
  'Lodge position matters: a bed far from the {park} gate steals the coolest hour of the morning.',
  'If the quote for this {category} trip hides park fees, send it back and ask for them in the total.',
  'Shared vehicles can be social and cheaper. They also stop for every passenger, which changes the shape of the day.',
  'A buffer night in {country} after a long flight keeps the first game drive from feeling like a punishment.',
  '{park2} can be a fine second chapter, but only after {park} has had enough time.',
  'Ranger instructions override itinerary poetry. If they close a track, the day changes, and that is correct.',
  'Meals on safari are hearty. Tell the camp about allergies before you arrive, not at the table.',
  'Cash for tips and small crafts is still wiser than assuming every stop takes a card.',
  '{currency}',
  '{visa}',
  'Reusable bottles are normal now. Still carry a backup because refills are not at every picnic stop.',
  'Rain jackets earn their space even in a month people call dry.',
  'Binoculars beat a phone zoom for almost every sighting you will care about.',
  'Leave the drone at home unless you have written permission. Most parks will not grant it.',
  'Community walks should be optional. A good {category} plan never forces a village visit into a tired afternoon.',
  'If you want a hot air balloon or a night drive, it must be booked as its own line, not assumed.',
  'Travel insurance that covers trekking and evacuation is worth reading before you like the photos.',
  'Domestic flights in {country} have weight limits. Weigh your bag at home if {keyword} uses a light aircraft.',
  'Road picnics are part of the pleasure. They also run long if the cats are on a kill, so do not schedule a tight lunch.',
  'Ask which guide is assigned, and whether they stay with you for the whole {keyword} route.',
  'Sun protection is not vanity here. Hats and sleeves matter by mid morning.',
  'Insect repellent in the evening is routine, even when the day felt dry and bright.',
];

const CLOSERS = [
  'Put that answer in writing before the deposit moves.',
  'Then compare two quotes side by side instead of trusting the lowest number.',
  'Eton Safaris can shape this around your month rather than a fixed departure grid.',
  'If the timing is wrong for you, shift the month. Do not shrink the park instead.',
  'Bring the question to a planner who has driven the road, not only sold the package.',
  'That single check prevents most of the disappointment we hear after rushed trips.',
  'It is a small conversation and it changes the whole week.',
  'Keep one afternoon empty on purpose.',
  'You will not miss the thing you cut. You will feel the thing you rushed.',
  'Say it plainly in your enquiry so the reply can be plain too.',
  'The right pace is the one you can still enjoy on day five.',
  'None of this needs luxury. It needs honesty about hours and fees.',
  'When the plan respects that, {park} does the rest.',
  'Hold the confirmation next to your passport expiry and your flight times.',
  'A calm start beats a famous lodge that sits three hours from the action.',
];

const SECTION_FOCUS = [
  'daylight hours and start times',
  'what is included in the price',
  'transfer length',
  'fitness and age',
  'where you sleep',
  'promises a guide should avoid',
  'the mix of activities',
  'health and sleep',
  'camera etiquette',
  'meals and water',
  'family pacing',
  'a second destination',
  'rain and mud',
  'dust and dry grass',
  'how to read the invoice',
  'clothing and shoes',
  'optional cultural stops',
  'why a rest morning helps',
];

function parkScore(keyword, parkName) {
  const tokens = String(keyword || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !['safari', 'tour', 'tours', 'trip', 'trips', 'holiday', 'package', 'packages', 'day', 'days'].includes(w));
  const hay = String(parkName || '').toLowerCase();
  return tokens.reduce((n, token) => n + (hay.includes(token) ? 1 : 0), 0);
}

function buildContext(keyword, country, category, facts, rng) {
  const parks = facts.parks?.length ? facts.parks : ['the main park'];
  const ranked = [...parks].sort((a, b) => parkScore(keyword, b) - parkScore(keyword, a) || a.localeCompare(b));
  const bestScore = parkScore(keyword, ranked[0]);
  const park = bestScore > 0 ? ranked[0] : parks[Math.floor(rng() * parks.length)];
  const rest = parks.filter((p) => p !== park);
  const park2 = rest.length ? rest[Math.floor(rng() * rest.length)] : park;
  return {
    keyword: stripHyphens(keyword),
    Keyword: stripHyphens(titleCase(keyword)),
    country: stripHyphens(facts.label || country),
    category: stripHyphens(category),
    park: stripHyphens(park),
    park2: stripHyphens(park2),
    dry: stripHyphens(facts.drySeason || ''),
    wet: stripHyphens(facts.wetSeason || ''),
    currency: stripHyphens(facts.currency || ''),
    visa: stripHyphens(facts.visa || ''),
    highlight: stripHyphens(facts.highlights || ''),
  };
}

const POINT_TITLES = [
  '{park}: What the Morning Actually Feels Like on {Keyword}',
  'Fees, Permits, and Lead Time for {Keyword}',
  'A Full Day near {park} on {Keyword}',
  'Who Should Slow {Keyword} Down',
  'Where You Sleep on {Keyword}',
  'Roads and Rest before {park}',
  'Rain, Dust, and Clothing for {Keyword}',
  'Walking, Driving, and Boat Time on {Keyword}',
  'Reading the Quote for {Keyword}',
  'Families, Couples, and Solo Guests on {Keyword}',
  'Community Visits that Belong on {Keyword}',
  'Photography and Distance at {park}',
  'Meals, Water, and Early Nights on {Keyword}',
  'Adding {park2} without Rushing {Keyword}',
];

const POINT_BODIES = [
  'Around {park}, {keyword} is an early start, a patient guide, and a return while the day is still kind. Guests who also look at ',
  'The money on {keyword} should be boringly clear: park fees, the bed, the vehicle, and meals named before you pay. Travellers comparing ',
  'A good {keyword} day near {park} leaves the middle of the afternoon free. That is when people stop treating the trip like a checklist and start noticing tracks. If you are weighing ',
  '{keyword} suits people who can sit quietly. It frustrates people who want a new gate every night. Say which you are when you enquire, and glance at ',
  'The lodge matters less than the minutes to the {park} gate. A beautiful room that costs you the dawn light is a poor trade on {keyword}. Routes such as ',
  'Ask how long the road really is. {country} distances look small on a phone map and feel long in a vehicle, especially toward {park}. Hold that next to ',
  '{dry} {wet} Pack for the month you booked, not the month in the brochure photo. People planning ',
  'Some {keyword} hours are in the vehicle, some are on foot, and a few may be on the water. Your knees and your curiosity should agree before you add ',
  'If the {keyword} voucher does not name the lodge and the guide arrangement, it is not finished. Send it back. A clearer example often sits beside ',
  'Children need a real lunch break. Couples often want fewer vehicles in view. Solo guests should ask how sharing works. All three can enjoy {keyword} if the plan says so in writing, unlike a generic link such as ',
  'A village or school stop on {keyword} should be optional and arranged with the community, not bolted on because the drive was short. Thoughtful guests also browse ',
  'At {park}, the animals set the distance. A guide who will not crowd them is doing the job properly on {keyword}. Photographers who agree with that usually also read ',
  'Food on {keyword} is generous and early. Tell the camp about allergies before you land, carry a bottle you can refill, and do not expect city hours. Similar notes show up under ',
  '{park2} can be a fine second chapter after {park}, but only if {keyword} still has idle time. Cutting sleep to collect parks is how good trips go flat. Compare that idea with ',
];

const POINT_TAILS = [
  '. Together they show another way to spend the same number of days.',
  '. They keep the same country and change the pace.',
  '. Open both before you lock the month.',
  '. Each one answers a different question about the same landscape.',
  '. They make the fees easier to picture.',
  '. They belong in the same conversation, not in a second holiday.',
];

function pointParagraph(ctx, rng, related, url1, url2, bodyIndex) {
  const lead = fill(POINT_BODIES[bodyIndex % POINT_BODIES.length], ctx);
  const bridge = pick(['and', 'or'], rng);
  const tail = fill(POINT_TAILS[bodyIndex % POINT_TAILS.length], ctx);
  const enders = [
    ' Ask for that in the written plan.',
    ' Then decide with your actual travel month in front of you.',
    ' The right answer is the one you can still enjoy on the last morning.',
    ' None of this needs a louder promise. It needs an honest timetable.',
  ];
  const end = fill(enders[bodyIndex % enders.length], ctx).trim();
  return paragraphFromParts([
    { text: `${lead.trim()} ` },
    { text: titleCase(stripHyphens(related[0]).trim()), link: true, url: url1 },
    { text: ` ${bridge} ` },
    { text: titleCase(stripHyphens(related[1]).trim()), link: true, url: url2 },
    { text: `${tail.trim()} ${end}` },
  ]);
}

function sharesPhrase(a, b) {
  const words = stripHyphens(a).toLowerCase().split(/\s+/).filter(Boolean);
  const other = stripHyphens(b).toLowerCase();
  for (let i = 0; i < words.length - 4; i += 1) {
    const slice = words.slice(i, i + 5).join(' ');
    if (other.includes(slice)) return true;
  }
  return false;
}

export function buildKeywordArticleDocument({
  keyword,
  country,
  category,
  allKeywordsInCategory,
  tours,
  facts,
  usedTitles,
}) {
  const main = keyword.trim();
  const relatedPool = allKeywordsInCategory.map((k) => k.keyword || k).filter(Boolean);
  const seed = `${country}|${category}|${main}`;
  const rng = makeRng(seed);
  const ctx = buildContext(main, country, category, facts, rng);
  const title = uniqueDocumentTitle(main, usedTitles, ctx, rng);
  const featuredTours = pickTours(tours, seed, 6);

  let meta = '';
  let intro = '';
  for (let attempt = 0; attempt < META_TEMPLATES.length; attempt += 1) {
    meta = fill(META_TEMPLATES[Math.floor(rng() * META_TEMPLATES.length)], ctx);
    intro = fill(INTRO_TEMPLATES[Math.floor(rng() * INTRO_TEMPLATES.length)], ctx);
    if (!sharesPhrase(meta, intro) && meta.toLowerCase() !== intro.toLowerCase()) break;
  }

  const children = [];
  children.push(heading(title, HeadingLevel.TITLE));

  children.push(heading('Meta description', HeadingLevel.HEADING_2));
  children.push(paragraphFromParts([{ text: meta }]));

  children.push(heading('Introduction', HeadingLevel.HEADING_2));
  children.push(paragraphFromParts([{ text: intro }]));

  children.push(heading(`Popular ${ctx.country} Safari Packages`, HeadingLevel.HEADING_2));
  for (const tour of featuredTours.slice(0, 5)) {
    children.push(
      paragraphFromParts(
        [
        {
            text: stripHyphens(tour.title),
          link: true,
          url: tourUrl(tour.slug),
        },
        ],
        80
      )
    );
  }

  const pointOrder = shuffle(
    POINT_TITLES.map((_, index) => index),
    rng
  ).slice(0, 7);
  const parkCycle = facts.parks?.length ? facts.parks : [ctx.park];
  pointOrder.forEach((bodyIndex, index) => {
    const pattern = POINT_TITLES[bodyIndex];
    const localRng = makeRng(`${seed}|point|${index}|${pattern}`);
    const pointCtx = {
      ...ctx,
      park: stripHyphens(parkCycle[index % parkCycle.length]),
      park2: stripHyphens(parkCycle[(index + 1) % parkCycle.length]),
    };
    children.push(heading(`${index + 1}. ${fill(pattern, pointCtx)}`, HeadingLevel.HEADING_2));
    const related = pickRelatedKeywords(relatedPool, main, `${seed}|rel|${index}`);
    const tourSlice = pickTours(tours, `${seed}|tour|${index}`, 4);
    const tour1 = tourSlice[0];
    const tour2 = tourSlice[1] || tourSlice[0];
    const url1 = tour1 ? tourUrl(tour1.slug) : `${SITE_BASE}/tours`;
    const url2 = tour2 ? tourUrl(tour2.slug) : url1;
    children.push(pointParagraph(pointCtx, localRng, related, url1, url2, bodyIndex));
  });

  function oneClosing(lines) {
    const line = lines[Math.floor(rng() * lines.length)];
    const extra = pick(
      [
        'Keep that beside the written plan for {keyword}.',
        'It is the detail that changes how {park} feels in {country}.',
        'Say it out loud when you compare two {category} quotes.',
        'Your month, not a brochure, should decide the rest.',
        'A calm reading of {keyword} starts with this, not with a slogan.',
      ],
      rng
    );
    return fill(`${line} ${extra}`, ctx);
  }

  const weatherLines = [
    'On {keyword}, dry months usually mean easier tracks and longer wildlife viewing near {park}. Mornings and evenings still ask for a layer. {dry} Greener months change the picture: {wet} Fewer vehicles and strong birding are the trade.',
    'Weather writes the timetable for {keyword}. {dry} If your dates fall in a wetter window, expect lush bush and slower roads. {wet} Pack a shell either way.',
    '{country} does not have one climate. Around {park}, {keyword} can be cool at dawn and warm by late morning. {dry} {wet} Ask which of those sentences matches your month.',
  ];
  const bestTimeLines = [
    '{keyword} can be rewarding in more than one season. Dry weeks make remote gates easier. Wet weeks suit people who prefer birds and green photographs. Plan community or school visits with your guide so you are not arriving on a closed day.',
    'The best month for {keyword} is the month you can travel without rushing the road to {park}. {dry} {wet} Tell your planner the dates you truly have, not the dates a brochure prefers.',
    'If permits or conservancy beds sell out, book {keyword} earlier than feels necessary. Peak dry weeks go first. A quieter month is often the kinder trip.',
  ];
  const howLines = [
    'The cleanest way to do {keyword} is through a written plan that names the lodge, the vehicle, and the community or park partner. Your visit should pay the people who look after {park}, not only a city desk.',
    'Experience {keyword} with a guide who stays with you, not a new face at every gate. Ask how conservancy or park fees reach local households around {park}. That answer matters more than a slogan.',
    'Choose {keyword} departures that leave a free afternoon. Rushed transfers make cultural stops feel staged. A slower route through {country} lets {park} and {park2} stay distinct.',
  ];
  const packLines = [
    'Bring neutral layers, shoes you can walk in after rain, a hat, a light rain shell, and a bottle you can refill. A camera is welcome. Ask before you photograph people. Leave drones and loud speakers at home unless the park has given permission.',
    'For {keyword}, pack less than you think and keep it soft sided if a light aircraft is involved. Evenings near {park} can cool quickly. Copies of your permit and passport belong in a separate pocket.',
    'Sun cream, a warm layer, insect repellent for dusk, and modest clothing for any community visit cover most of {keyword}. White outfits show dust. Strong perfume bothers wildlife and guides alike.',
  ];
  const whyLines = [
    'Eton Safaris plans {keyword} as a private or small group journey with the price written down and partners on the ground in {country}. We line up permits, beds, and driving days so the trip fits your pace. You keep the mornings. We keep the logistics.',
    'Booking {keyword} with Eton Safaris means a named route, not a vague area. We work with guides who know {park}, and we say what is included before you send a deposit. The holiday should feel like yours.',
    'We build {keyword} around the month you can travel and the energy you actually have. Airport meet, lodges, and park time sit in one plan. If something about {category} in {country} should change, we change it before you fly.',
  ];

  children.push(heading(`Weather and Climate on ${ctx.Keyword}`, HeadingLevel.HEADING_2));
  children.push(paragraphFromParts([{ text: oneClosing(weatherLines) }]));

  children.push(heading(`Best Time for ${ctx.Keyword}`, HeadingLevel.HEADING_2));
  children.push(paragraphFromParts([{ text: oneClosing(bestTimeLines) }]));

  children.push(heading(`How to Experience ${ctx.Keyword}`, HeadingLevel.HEADING_2));
  children.push(paragraphFromParts([{ text: oneClosing(howLines) }]));

  children.push(heading(`What to Carry for ${ctx.Keyword}`, HeadingLevel.HEADING_2));
  children.push(paragraphFromParts([{ text: oneClosing(packLines) }]));

  children.push(heading(`Why Book with Eton Safaris for ${ctx.Keyword}`, HeadingLevel.HEADING_2));
  children.push(
    paragraphFromParts([
      { text: `${oneClosing(whyLines)} Browse current routes at ` },
      { text: `${SITE_BASE}/tours`, link: true, url: `${SITE_BASE}/tours` },
      { text: '.' },
    ])
  );

  const description = stripHyphens(meta).slice(0, 300);

  return {
    title,
    doc: new Document({
      creator: 'Eton Safaris',
      title,
      description,
      sections: [{ children }],
    }),
  };
}

export async function writeKeywordArticleDoc(filePath, document) {
  const buffer = await Packer.toBuffer(document);
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, buffer);
}
