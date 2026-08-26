/**
 * National park catalog for seeding (aligned with Eton Safaris destinations).
 * Each entry mirrors the Uganda Bwindi CMS shape: location, overview title, blocks.
 */

/** @typedef {{ name: string, location: string, hook: string, wildlife: string, visit: string, experiences: string }} ParkDef */

function p(name, location, hook, wildlife, visit, experiences) {
  return { name, location, hook, wildlife, visit, experiences };
}

/** @type {Record<string, ParkDef[]>} */
export const PARKS_BY_COUNTRY = {
  Uganda: [
    p(
      'Bwindi Impenetrable National Park',
      'Southwestern Uganda',
      'a UNESCO World Heritage rainforest and one of Africa\'s strongest holds for mountain gorillas',
      'habituated mountain gorilla families, forest elephants, chimpanzees, colobus monkeys, and more than 350 bird species including Albertine Rift endemics',
      'Trekking sectors at Buhoma, Ruhija, Rushaga, and Nkuringo are reached via Kisoro or Kabale, with lodge bases on the forest edge',
      'gorilla trekking, gorilla habituation experiences, guided forest walks, birding, and Batwa community visits'
    ),
    p(
      'Mgahinga Gorilla National Park',
      'Southwestern Uganda near Kisoro',
      'Uganda\'s portion of the Virunga volcanoes and a compact gorilla and golden monkey destination',
      'mountain gorillas, golden monkeys, buffalo, bushbuck, and highland birdlife across three volcanic cones',
      'Access is typically via Kisoro, with short transfers to the park headquarters for briefings and guided treks',
      'gorilla trekking, golden monkey tracking, volcano hikes, and borderland cultural encounters'
    ),
    p(
      'Queen Elizabeth National Park',
      'Western Uganda along the Albertine Rift',
      'a classic savannah and wetland park famous for the Kazinga Channel and tree climbing lions in Ishasha',
      'elephants, buffalo, Uganda kob, hippos, crocodiles, lions, and rich birdlife along crater lakes and channels',
      'Reached from Kasese or via the Fort Portal to Mbarara corridor, with Mweya and Ishasha as popular bases',
      'game drives, Kazinga boat cruises, crater lake viewpoints, and chimpanzee tracking in Kyambura Gorge'
    ),
    p(
      'Murchison Falls National Park',
      'Northwestern Uganda',
      'Uganda\'s largest national park, where the Nile explodes through a narrow gorge at Murchison Falls',
      'elephants, giraffes, buffalo, lions, hippos, crocodiles, and hundreds of bird species along the Nile delta',
      'Driving from Kampala takes roughly five to six hours, or guests fly into the park airstrips for quicker access',
      'Nile boat trips to the falls, savannah game drives, top of the falls hike, and rhino tracking in nearby sanctuaries'
    ),
    p(
      'Kibale National Park',
      'Western Uganda near Fort Portal',
      'often called Africa\'s primate capital thanks to its dense rainforest chimpanzee population',
      'chimpanzees, red colobus, L\'Hoest\'s monkeys, forest elephants, and exceptional understory birdlife',
      'Fort Portal is the main gateway, with park headquarters at Kanyanchu for chimpanzee tracking briefings',
      'chimpanzee tracking, forest walks, Bigodi wetland birding, and crater lake day trips'
    ),
    p(
      'Lake Mburo National Park',
      'Western Uganda between Kampala and Mbarara',
      'a compact savannah park ideal for shorter itineraries and walking or boat based wildlife viewing',
      'zebras, impala, eland, topi, hippos, and more than 350 bird species around its lakes',
      'About a four hour drive from Kampala on the western highway, with easy same day or overnight options',
      'game drives, boat rides, horseback safaris, guided walks, and mountain biking'
    ),
    p(
      'Kidepo Valley National Park',
      'Northeastern Uganda',
      'a remote wilderness of rugged valleys and one of Uganda\'s most dramatic Big Five landscapes',
      'lions, cheetahs, elephants, buffalo, zebra, and ostrich across open plains and rocky kopjes',
      'Usually reached by charter flight or a long overland journey via Kotido or Kaabong',
      'game drives, guided walks, cultural visits with Karamojong communities, and night sky viewing'
    ),
    p(
      'Mount Elgon National Park',
      'Eastern Uganda on the Kenya border',
      'an extinct volcano massif of caves, waterfalls, and afro alpine crater rim hiking',
      'forest monkeys, elephant trails in lower forests, and highland birds around the caldera',
      'Mbale is the usual gateway for Sipi Falls approaches and park trailheads',
      'caldera treks, cave visits, Sipi Falls walks, and community coffee tours'
    ),
    p(
      'Rwenzori Mountains National Park',
      'Western Uganda on the Congo border',
      'the legendary Mountains of the Moon, a UNESCO alpine wilderness of glaciers and giant lobelias',
      'Rwenzori turaco, rock hyrax, chameleon species, and afro alpine plant communities',
      'Kasese and Nyakalengijo are the main trailheads for multi day climbing circuits',
      'central circuit treks, peak attempts, and misty montane photography'
    ),
    p(
      'Semuliki National Park',
      'Western Uganda in the Albertine Rift',
      'a lowland rainforest pocket with Congolese flora, hot springs, and rare birds',
      'forest primates, elephants on the fringe, and Central African bird specialties',
      'Reached via Fort Portal toward Bundibugyo with short transfers into the forest',
      'hot spring visits, forest birding, and primate walks'
    ),
  ],
  Kenya: [
    p(
      'Masai Mara National Reserve',
      'Southwestern Kenya',
      'Kenya\'s most famous savannah reserve and a centrepiece of Great Migration viewing',
      'Big Five game, massive wildebeest herds in season, cheetahs, and dense predator populations',
      'Reached by road from Nairobi or by scheduled flights into Mara airstrips',
      'game drives, hot air balloon safaris, Maasai cultural visits, and river crossings in season'
    ),
    p(
      'Aberdare National Park',
      'Central Kenya highlands',
      'a misty mountain park of waterfalls, bamboo forests, and highland game',
      'elephants, buffalo, black rhino in forest glades, and rare bongo in remoter valleys',
      'Accessed via Nyeri or Naivasha with lodge and self drive gate options',
      'forest game drives, waterfall walks, and highland lodge stays'
    ),
    p(
      'Amboseli National Park',
      'Southern Kenya near the Tanzania border',
      'iconic elephant country with clear views of Mount Kilimanjaro on clear mornings',
      'large elephant herds, lions, buffalo, cheetahs, and wetland birdlife',
      'About a four hour drive from Nairobi, or a short flight to Amboseli airstrip',
      'game drives, swamp boardwalks, photography at dawn, and cultural visits'
    ),
    p(
      'Arabuko Sokoke National Park',
      'Coastal Kenya near Watamu',
      'East Africa\'s largest coastal forest and a birder\'s sanctuary of endemic species',
      'Sokoke scops owl, Clarke\'s weaver, golden rumped elephant shrew, and forest antelope',
      'Day trips from Watamu or Malindi with guided forest trails',
      'birding walks, butterfly spotting, and Gede Ruins combinations'
    ),
    p(
      'Central Island National Park',
      'Lake Turkana, northern Kenya',
      'a volcanic crater island rising from Jade Sea waters with nesting crocodiles',
      'Nile crocodiles, waterbirds, and stark volcanic crater lakes',
      'Boat access from the western Turkana shore on specialist itineraries',
      'island boat landings, crater rim walks, and remote photography'
    ),
    p(
      'Chyulu Hills National Park',
      'Southern Kenya between Amboseli and Tsavo',
      'a green volcanic ridge of lava tubes, cloud forest, and sweeping plains views',
      'elephants moving between Tsavo and Amboseli, giraffe, and highland birds',
      'Usually visited via Chyulu or Amboseli circuit lodges with guided access',
      'lava tube exploration, walking, and scenic ridge drives'
    ),
    p(
      'Hell\'s Gate National Park',
      'Rift Valley near Naivasha',
      'a dramatic gorge park where you can cycle or walk among zebra and giraffe',
      'zebra, giraffe, buffalo, and cliff nesting birds along geothermal cliffs',
      'A short drive from Naivasha town or the Nairobi highway corridor',
      'cycling safaris, gorge hikes, and rock climbing where permitted'
    ),
    p(
      'Kisite-Mpunguti Marine National Park',
      'South coast Kenya near Shimoni',
      'a coral reef and island park famous for dolphin sightings and clear snorkel water',
      'dolphins, reef fish, turtles, and migratory seabirds around Wasini',
      'Boat trips from Shimoni or Diani are the standard approach',
      'snorkeling, dhow sails, and Wasini Island seafood lunches'
    ),
    p(
      'Kora National Park',
      'Eastern Kenya along the Tana River',
      'a remote bush park linked to George Adamson\'s lion rehabilitation legacy',
      'lions, elephants, lesser kudu, and dry country birds along riverine strips',
      'Specialist guided access via the Meru or Garissa corridors',
      'remote game drives and conservation history focused visits'
    ),
    p(
      'Lake Nakuru National Park',
      'Central Rift Valley, Kenya',
      'a compact park around an alkaline lake known for rhinos and flamingo spectacles',
      'black and white rhinos, lions, leopards, buffalo, and waterbirds',
      'About a two hour drive from Nairobi on the Rift Valley highway',
      'game drives, lakeshore birding, and baboon cliff viewpoints'
    ),
    p(
      'Malindi Marine National Park',
      'Kenya\'s north coast at Malindi',
      'one of Africa\'s oldest marine parks, protecting coral gardens and clear lagoons',
      'reef fish, turtles, dolphins offshore, and coastal birdlife',
      'Boat and glass bottom excursions leave from Malindi beachfront',
      'snorkeling, diving, and reef glass bottom tours'
    ),
    p(
      'Malka Mari National Park',
      'Northeastern Kenya on the Ethiopia border',
      'a little visited arid wilderness of rocky hills and seasonal river courses',
      'desert adapted antelope, dik dik, and dry country birds',
      'Reached only on specialist overland or research style itineraries',
      'remote wilderness travel and arid landscape photography'
    ),
    p(
      'Meru National Park',
      'Eastern Kenya north of Mount Kenya',
      'a lush, less crowded park of palm lined rivers and the Born Free legacy',
      'elephants, lions, Grevy\'s zebra in adjoining reserves, and rich birdlife',
      'Flights or road access via Meru town and Elsa\'s Kopje style camps',
      'game drives, riverine walks, and quiet photographic safaris'
    ),
    p(
      'Mombasa Marine National Park',
      'Offshore Mombasa, Kenya',
      'a near shore reef park protecting coral gardens opposite the city beaches',
      'reef fish, turtles, and seasonal dolphin sightings',
      'Glass bottom boats and dive operators depart from Mombasa and Nyali',
      'snorkeling, diving, and short reef excursions'
    ),
    p(
      'Mount Elgon National Park',
      'Western Kenya on the Uganda border',
      'Kenya\'s side of the Elgon massif, known for salt mining elephants in lava caves',
      'elephants entering Kitum and related caves, forest monkeys, and highland birds',
      'Accessed via Kitale with trailheads toward the caldera and caves',
      'cave walks, waterfall hikes, and crater rim treks'
    ),
    p(
      'Mount Kenya National Park',
      'Central Kenya',
      'a UNESCO World Heritage peak of glaciers, afro alpine zones, and high altitude trekking',
      'hyrax, high altitude birds, buffalo in lower forests, and endemic flora',
      'Nanyuki and Naro Moru are the main gateways for climb logistics',
      'summit routes, day hikes, and scenic mountain lodges'
    ),
    p(
      'Mount Longonot National Park',
      'Rift Valley near Naivasha',
      'a steep volcanic cone with a crater rim trail and sweeping Rift views',
      'small antelope, giraffe on lower slopes, and soaring raptors',
      'A short drive from the Nairobi to Naivasha highway',
      'crater rim hikes and sunrise summit walks'
    ),
    p(
      'Nairobi National Park',
      'On the edge of Nairobi',
      'a unique city edge wilderness where skyline and savannah meet',
      'rhinos, lions, giraffes, buffalo, and rich birdlife',
      'Minutes from central Nairobi, ideal for arrival or departure days',
      'short game drives, rhino viewing, and introductory safari photography'
    ),
    p(
      'Ndere Island National Park',
      'Winam Gulf, Lake Victoria',
      'a green island sanctuary in Lake Victoria with open views and quiet walks',
      'impala, hippos offshore, monitor lizards, and lake birds',
      'Boat access from Kisumu for day visits',
      'island walks, birding, and picnic excursions'
    ),
    p(
      'Ol Donyo Sabuk National Park',
      'East of Nairobi near Thika',
      'a solitary mountain park with buffalo herds and views toward Nairobi',
      'buffalo, leopard rarely, and mixed woodland birds',
      'A straightforward day trip from Nairobi via Thika',
      'summit hikes and short game drives'
    ),
    p(
      'Ruma National Park',
      'Nyanza near Lake Victoria',
      'Kenya\'s only park protecting the rare roan antelope in open grassland hills',
      'roan antelope, oribi, giraffe, and seasonal bird concentrations',
      'Accessed via Homa Bay with guided or self drive options',
      'game drives focused on roan and open country birding'
    ),
    p(
      'Saiwa Swamp National Park',
      'Western Kenya near Kitale',
      'Kenya\'s smallest national park, built around boardwalks and sitatunga habitat',
      'sitatunga antelope, De Brazza\'s monkeys, and wetland birds',
      'A short drive from Kitale into the swamp boardwalk system',
      'elevated boardwalk walks and quiet birding'
    ),
    p(
      'Samburu National Reserve',
      'Northern Kenya',
      'a semi arid reserve famous for unusual northern specialist species',
      'Grevy\'s zebra, reticulated giraffe, Somali ostrich, gerenuk, and elephants along the Ewaso Nyiro',
      'Flights from Nairobi or a scenic road journey via Nanyuki',
      'game drives, river walks, and cultural visits with Samburu communities'
    ),
    p(
      'Sibiloi National Park',
      'Eastern shore of Lake Turkana',
      'a UNESCO fossil landscape of Koobi Fora badlands beside the Jade Sea',
      'dry country fauna, crocodile shores, and paleontological sites',
      'Remote fly in or challenging overland routes via North Horr',
      'fossil site visits, lakeshore exploration, and desert camping'
    ),
    p(
      'South Island National Park',
      'Lake Turkana, northern Kenya',
      'a volcanic island of lava fields and dense crocodile populations',
      'Nile crocodiles, island birds, and stark volcanic terrain',
      'Boat expeditions from the Turkana shore on specialist trips',
      'island landings and rugged landscape photography'
    ),
    p(
      'Tsavo East National Park',
      'Southeastern Kenya',
      'a vast red earth wilderness known for open plains and the Galana River',
      'elephants, lions, buffalo, giraffe, and abundant birdlife along riverine corridors',
      'Accessed via Voi or from the Mombasa road corridor with airstrip options',
      'game drives, riverine birding, and multi day safari circuits with Tsavo West'
    ),
    p(
      'Tsavo West National Park',
      'Southeastern Kenya',
      'a rugged volcanic landscape with Mzima Springs and dramatic lava fields',
      'elephants, rhinos in protected areas, hippos at Mzima Springs, and diverse antelope',
      'Linked with Tsavo East via Voi and Mtito Andei gateways',
      'Mzima Springs boardwalk, game drives, and crater rim viewpoints'
    ),
    p(
      'Watamu Marine National Park',
      'Kenya\'s north coast at Watamu',
      'a turquoise lagoon park of coral gardens, turtle nesting beaches, and mangroves',
      'reef fish, turtles, dugongs rarely, and shorebirds in adjoining creeks',
      'Boat and snorkel trips depart from Watamu village beaches',
      'snorkeling, diving, and Mida Creek birding combinations'
    ),
    p(
      'Marsabit National Park',
      'Northern Kenya around Marsabit mountain',
      'a mist forest island in the desert with crater lakes and elephant herds',
      'elephants, greater kudu, and highland birds around Lake Paradise',
      'Reached via Marsabit town on northern Kenya overland routes',
      'crater rim drives, forest walks, and desert to highland contrasts'
    ),
  ],
  Tanzania: [
    p(
      'Arusha National Park',
      'Northern Tanzania near Arusha',
      'a compact park of Mount Meru forests, Momella Lakes, and Ngurdoto Crater',
      'giraffes, buffalo, colobus monkeys, flamingos on alkaline lakes, and rich birdlife',
      'A short drive from Arusha city, ideal for acclimatization days',
      'game drives, canoeing on Momella Lakes, and Mount Meru climbs'
    ),
    p(
      'Burigi-Chato National Park',
      'Northwestern Tanzania near Lake Victoria',
      'a newly designated western park of rolling hills, lakes, and recovering wildlife',
      'buffalo, antelope herds, hippos on lake shores, and expanding predator numbers',
      'Accessed via Biharamulo or Chato with developing lodge infrastructure',
      'game drives and lakeshore birding on quieter western circuits'
    ),
    p(
      'Gombe Stream National Park',
      'Western Tanzania on Lake Tanganyika',
      'Jane Goodall\'s historic chimpanzee research forest on steep lake shores',
      'chimpanzees, olive baboons, red colobus, and lakeshore birds',
      'Boat access from Kigoma is the only practical approach',
      'chimpanzee trekking and forest lakeshore walks'
    ),
    p(
      'Ibanda-Kyerwa National Park',
      'Northwestern Tanzania near the Uganda border',
      'a highland border park of grasslands and forest patches in the Kagera region',
      'buffalo, antelope, primates in forest remnants, and regional birdlife',
      'Reached via Bukoba or borderland road networks on specialist trips',
      'game drives and quiet borderland wilderness exploration'
    ),
    p(
      'Katavi National Park',
      'Western Tanzania',
      'a remote floodplain park where dry season wildlife crowds around the Katuma River',
      'huge buffalo herds, lions, hippos, crocodiles, and elephants in peak dry months',
      'Fly in camps from Dar es Salaam or Arusha are the practical route',
      'game drives, walking safaris, and true wilderness fly camping'
    ),
    p(
      'Kigosi National Park',
      'Northwestern Tanzania in the Moyowosi ecosystem',
      'a vast wetland and woodland park in one of East Africa\'s great floodplain systems',
      'buffalo, sable, roan, lions, and prolific waterbirds in season',
      'Remote fly in or specialist mobile safari access from the northwest',
      'floodplain game drives and bird focused expeditions'
    ),
    p(
      'Kilimanjaro National Park',
      'Northern Tanzania',
      'home to Africa\'s highest peak and a world class trekking destination',
      'montane forest wildlife, birds, and high altitude habitats rather than classic savannah game',
      'Moshi and Arusha are the main gateways for climb briefings and transfers',
      'multi day summit routes, rainforest walks, and cultural day trips'
    ),
    p(
      'Kitulo National Park',
      'Southern Highlands of Tanzania',
      'the Garden of God, a plateau park famed for orchids and wildflower meadows',
      'orchids, endemic plants, reedbuck, and highland birds rather than Big Five game',
      'Accessed via Mbeya with seasonal flower peak visits',
      'wildflower walks, plateau hiking, and botanical photography'
    ),
    p(
      'Lake Manyara National Park',
      'Northern Tanzania',
      'a compact Rift Valley park with groundwater forest and alkaline lake shores',
      'tree climbing lions, elephants, hippos, flamingos, and monkeys',
      'A short drive from Arusha or a stop between Tarangire and Ngorongoro',
      'game drives, canopy walks in nearby areas, and birding'
    ),
    p(
      'Mahale Mountains National Park',
      'Western Tanzania on Lake Tanganyika',
      'a remote lakeshore rainforest where chimpanzees live above turquoise water',
      'chimpanzees, forest primates, and clear lake swimming beaches',
      'Fly in or boat access from Kigoma to lakeshore camps',
      'chimpanzee trekking, snorkeling, and forest beach time'
    ),
    p(
      'Mikumi National Park',
      'Central Tanzania on the Dar to Iringa highway',
      'an accessible savannah park often called a mini Serengeti for southern circuits',
      'lions, elephants, giraffe, zebra, and rich birdlife on open plains',
      'A straightforward road stop between Dar es Salaam and Ruaha',
      'game drives and short safari add ons to southern itineraries'
    ),
    p(
      'Mkomazi National Park',
      'Northeastern Tanzania near Tsavo',
      'a dry Nyika style park with rhino sanctuary work and open acacia country',
      'black rhinos in protected areas, oryx, gerenuk, and dry country predators',
      'Accessed via Same or the northern circuit road network',
      'game drives and rhino conservation focused visits'
    ),
    p(
      'Nyerere National Park',
      'Southern Tanzania',
      'Africa\'s largest national park, formerly Selous, defined by rivers and boat safaris',
      'elephants, lions, wild dogs, hippos, crocodiles, and prolific birds',
      'Fly in safari camps from Dar es Salaam are the practical approach',
      'boat safaris, game drives, and walking safaris'
    ),
    p(
      'Ruaha National Park',
      'Southern Tanzania',
      'a wild southern circuit park where the Great Ruaha River shapes the landscape',
      'elephants, lions, wild dogs, kudu, and outstanding birdlife',
      'Usually accessed by flight from Dar es Salaam or Arusha',
      'game drives, walking safaris, and remote fly camp experiences'
    ),
    p(
      'Rubondo Island National Park',
      'Lake Victoria, northwestern Tanzania',
      'a forested island park of chimpanzees, elephants, and quiet lake shores',
      'chimpanzees, elephants, sitatunga, and rich lakeshore birdlife',
      'Boat or light aircraft access from the Lake Victoria region',
      'chimpanzee walks, fishing, and island birding'
    ),
    p(
      'Rumanyika-Karagwe National Park',
      'Northwestern Tanzania in Karagwe',
      'a highland park of ridges and valleys in Tanzania\'s far northwest',
      'buffalo, antelope, primates, and regional forest edge birds',
      'Reached via Bukoba and Karagwe road networks on specialist trips',
      'scenic game drives and highland wilderness exploration'
    ),
    p(
      'Saadani National Park',
      'Tanzanian coast north of Dar es Salaam',
      'where bush meets beach, with giraffe on dunes and Indian Ocean surf',
      'giraffes, elephants, lions inland, hippos in the Wami, and coastal birds',
      'Road or flight access from Dar es Salaam with beach lodge bases',
      'game drives, boat trips on the Wami, and beach time'
    ),
    p(
      'Saanane Island National Park',
      'Lake Victoria at Mwanza',
      'Tanzania\'s smallest national park, a rocky island sanctuary near Mwanza',
      'zebra, wildebeest, impala, and rock loving reptiles on granite outcrops',
      'Short boat rides from Mwanza make it an easy city excursion',
      'island walks and introductory wildlife viewing'
    ),
    p(
      'Serengeti National Park',
      'Northern Tanzania',
      'one of the world\'s great savannah ecosystems and the heart of the Great Migration',
      'Big Five animals, enormous wildebeest herds, cheetahs, and hyenas',
      'Flights into Seronera or transfers via Arusha and the Ngorongoro gateway',
      'game drives, balloon safaris, and migration following circuits'
    ),
    p(
      'Tarangire National Park',
      'Northern Tanzania',
      'famous for baobab dotted plains and large dry season elephant gatherings',
      'elephants, baobab landscapes, lions, zebra, and prolific birdlife',
      'About a two hour drive from Arusha on the northern safari circuit',
      'game drives, walking safaris in adjoining concessions, and photography'
    ),
    p(
      'Udzungwa Mountains National Park',
      'Southern Tanzania Eastern Arc',
      'a biodiversity hotspot of waterfalls, endemic primates, and rainforest trails',
      'Udzungwa red colobus, Sanje mangabey, and exceptional Eastern Arc birds',
      'Accessed via Mikumi or Ifakara with trailhead bases at Mang\'ula',
      'waterfall hikes, primate walks, and endemic birding'
    ),
    p(
      'Ugalla River National Park',
      'Western Tanzania',
      'a miombo woodland and river park in Tanzania\'s remote west',
      'sable, roan, elephants, lions, and woodland bird assemblages',
      'Specialist fly in or overland access from Tabora region routes',
      'river focused game drives and miombo wilderness camping'
    ),
    p(
      'Ngorongoro Conservation Area',
      'Northern Tanzania',
      'a vast caldera where wildlife concentrates on the crater floor year round',
      'lions, elephants, buffalo, black rhinos, and dense herbivore herds',
      'Reached from Arusha via Karatu with crater descent on guided game drives',
      'crater game drives, highland walks, and cultural visits'
    ),
  ],
  Rwanda: [
    p(
      'Volcanoes National Park',
      'Northwestern Rwanda',
      'Rwanda\'s premier mountain gorilla and golden monkey trekking park in the Virungas',
      'mountain gorillas, golden monkeys, buffalo, and highland birds',
      'About a two and a half hour drive from Kigali to Kinigi headquarters',
      'gorilla trekking, golden monkey tracking, Dian Fossey hike, and community visits'
    ),
    p(
      'Akagera National Park',
      'Eastern Rwanda',
      'Rwanda\'s Big Five savannah park along the border lakes and papyrus wetlands',
      'lions, rhinos, elephants, buffalo, giraffe, and rich waterbird life',
      'Reached by road from Kigali in roughly two and a half hours',
      'game drives, boat safaris on Lake Ihema, and night drives where permitted'
    ),
    p(
      'Nyungwe National Park',
      'Southwestern Rwanda',
      'an ancient rainforest park known for chimpanzees and a dramatic canopy walkway',
      'chimpanzees, colobus monkeys, orchids, and Albertine Rift birds',
      'Accessed via Huye or a scenic drive from Kigali into the southwest',
      'chimpanzee tracking, canopy walk, waterfall hikes, and birding'
    ),
    p(
      'Gishwati-Mukura National Park',
      'Western Rwanda',
      'a restored Albertine Rift forest park bridging conservation and community livelihoods',
      'chimpanzees, golden monkeys in adjoining forests, and highland birdlife',
      'Reached from Rubavu or the Kigali to west road corridor',
      'chimpanzee tracking, canopy experiences, and community forest walks'
    ),
  ],
  Botswana: [
    p(
      'Chobe National Park',
      'Northern Botswana',
      'famous for huge elephant herds and riverfront game viewing along the Chobe River',
      'elephants, buffalo, lions, hippos, crocodiles, and waterbirds',
      'Kasane is the main gateway with easy links to Victoria Falls',
      'riverboat safaris, game drives, and photographic hide sessions'
    ),
    p(
      'Makgadikgadi Pans National Park',
      'Central Botswana',
      'a surreal salt pan wilderness of zebra migrations and endless white horizons',
      'zebra and wildebeest in green season, flamingos on flooded pans, and meerkats on the edges',
      'Accessed via Maun or Nata with mobile camps on the pan fringes',
      'quad bike or 4x4 pan drives, meerkat encounters, and star filled nights'
    ),
    p(
      'Nxai Pan National Park',
      'Northern fringe of the Makgadikgadi',
      'famed for Baines\' Baobabs and seasonal zebra gatherings on short grass pans',
      'zebra, springbok, lions, giraffes, and desert adapted predators',
      'Usually combined with Makgadikgadi circuits from Maun',
      'pan game drives, baobab photography, and seasonal migration viewing'
    ),
    p(
      'Kgalagadi Transfrontier Park',
      'Southwestern Botswana on the South Africa border',
      'a red dune and dry riverbed wilderness shared with South Africa',
      'black maned lions, meerkats, oryx, springbok, and raptors over dune roads',
      'Entered via Two Rivers or linked with the South African Kgalagadi gates',
      'predator focused game drives and dune road self drive circuits'
    ),
    p(
      'Moremi Game Reserve',
      'Okavango Delta, Botswana',
      'a protected heart of the Okavango with classic water and land safari combinations',
      'lions, leopards, wild dogs, elephants, and prolific birdlife',
      'Fly in camps from Maun are the usual approach into the delta',
      'mokoro excursions, game drives, and walking safaris'
    ),
    p(
      'Central Kalahari Game Reserve',
      'Central Botswana',
      'a vast desert reserve of open pans, black maned lions, and extreme wilderness',
      'lions, oryx, springbok, brown hyena, and desert adapted species',
      'Self drive or mobile safari circuits from Maun or Ghanzi',
      'mobile camping, game drives, and star filled nights'
    ),
  ],
  Namibia: [
    p(
      'Etosha National Park',
      'Northern Namibia',
      'a salt pan dominated park where wildlife concentrates around productive waterholes',
      'elephants, rhinos, lions, giraffe, zebra, and prolific waterhole drama',
      'Reached from Windhoek via Anderson or Von Lindequist gates',
      'waterhole game viewing, night drives in adjoining areas, and photography'
    ),
    p(
      'Namib Naukluft National Park',
      'Western Namibia',
      'home to towering red dunes around Sossusvlei and Deadvlei',
      'oryx, springbok, desert adapted creatures, and dramatic dune landscapes',
      'Sesriem is the main entry for sunrise dune excursions',
      'dune climbs, Deadvlei walks, and scenic drives'
    ),
    p(
      'Skeleton Coast National Park',
      'Northwestern Namibia',
      'a remote Atlantic coastline of shipwrecks, fog banks, and desert wilderness',
      'seals, desert adapted elephants in adjoining areas, and coastal birds',
      'Usually visited on fly in or specialist guided circuits',
      'coastal flights, seal colonies, and wilderness photography'
    ),
    p(
      'Waterberg Plateau National Park',
      'Central Namibia',
      'a flat topped sandstone plateau with rare antelope and sweeping bush views',
      'sable, roan, eland, white rhino in managed areas, and cliff nesting birds',
      'A few hours northeast of Windhoek with lodge and camping bases',
      'plateau hikes, game drives, and hide viewing'
    ),
    p(
      'Bwabwata National Park',
      'Zambezi Region, northeastern Namibia',
      'a transboundary wildlife corridor linking Angola, Botswana, and Zambia routes',
      'elephants, buffalo, hippos along the Kavango and Kwando, and wetland birds',
      'Accessed via Divundu or Kongola on Caprivi strip itineraries',
      'river game viewing, birding, and corridor safari drives'
    ),
    p(
      'Mudumu National Park',
      'Zambezi Region, Namibia',
      'a woodland and channel park along the Kwando River floodplains',
      'elephants, lions, buffalo, and rich birdlife in riverine forest',
      'Reached via Kongola with camps near the Kwando channels',
      'game drives, boat trips where water allows, and birding'
    ),
    p(
      'Nkasa Rupara National Park',
      'Zambezi Region, Namibia',
      'Namibia\'s wettest park, a mini Okavango of islands and flood channels',
      'elephants, red lechwe, hippos, crocodiles, and floodplain birds',
      'Accessed via Sangwali with 4x4 essential in wet months',
      'floodplain game drives and channel exploration'
    ),
    p(
      'Khaudum National Park',
      'Northeastern Namibia',
      'a remote sandveld wilderness for experienced self drivers and mobile safaris',
      'elephants, lions, wild dogs, roan, and dry woodland specialists',
      '4x4 access from Grootfontein or the Caprivi corridor with full supplies',
      'self drive wilderness circuits and remote camping'
    ),
    p(
      'Dorob National Park',
      'Central Namib coast around Swakopmund',
      'a coastal desert park of dunes, lichen fields, and Atlantic fog belts',
      'desert adapted beetles, jackals, flamingos at lagoons, and coastal birds',
      'Day trips from Swakopmund or Walvis Bay into dune and coastal zones',
      'dune drives, birding at Sandwich Harbour links, and desert walks'
    ),
    p(
      'Ai-Ais Richtersveld Transfrontier Park',
      'Southern Namibia on the Orange River',
      'a rugged desert mountain park shared with South Africa\'s Richtersveld',
      'klipspringer, desert lizards, and stark succulent Karoo flora',
      'Accessed via Ai-Ais or Orange River crossings on 4x4 routes',
      'hot springs at Ai-Ais, canyon drives, and desert hiking'
    ),
    p(
      'Tsau Khaeb National Park',
      'Southwestern Namibia (Sperrgebiet)',
      'the former diamond Sperrgebiet, now a protected desert of wildflowers and ghost towns',
      'desert adapted fauna, coastal birds, and extraordinary plant diversity after rains',
      'Guided access from Luderitz into formerly restricted diamond areas',
      'guided desert tours, Kolmanskop links, and flower season visits'
    ),
  ],
  Zambia: [
    p(
      'Blue Lagoon National Park',
      'Kafue Flats west of Lusaka',
      'a wetland park of floodplains and lagoons on the Kafue Flats',
      'Kafue lechwe, zebra, waterbirds, and seasonal stork gatherings',
      'Day or overnight trips from Lusaka into the flats',
      'birding, floodplain game viewing, and photography'
    ),
    p(
      'Isangano National Park',
      'Northern Zambia near Bangweulu',
      'a little visited floodplain park on the Bangweulu wetland fringe',
      'black lechwe nearby in the wider system, waterbirds, and floodplain grazers',
      'Specialist access via the Bangweulu and Kasanka circuits',
      'wetland birding and remote floodplain exploration'
    ),
    p(
      'Kafue National Park',
      'Central and western Zambia',
      'one of Africa\'s largest parks with diverse habitats from Busanga Plains to riverine woodland',
      'lions, cheetahs, wild dogs, red lechwe, and wide antelope variety',
      'Accessed via Lusaka with fly in options to remote camps',
      'game drives, boat trips, and Busanga seasonal plains safaris'
    ),
    p(
      'Kasanka National Park',
      'Central Zambia',
      'world famous for the vast October to December straw coloured fruit bat migration',
      'fruit bats in season, sitatunga, blue monkeys, and woodland birds',
      'Reached via Serenje with lodge bases near Fibwe hide',
      'bat migration viewing, canoeing, and woodland walks'
    ),
    p(
      'Lavushi Manda National Park',
      'Northern Zambia',
      'a scenic park of granite hills, miombo woodland, and quiet wilderness',
      'roan, sable, hartebeest, and miombo bird specialists',
      'Accessed via Mpika on the Great North Road corridor',
      'hiking, game drives, and remote camping'
    ),
    p(
      'Liuwa Plain National Park',
      'Western Zambia',
      'an open grassland park of wildebeest migration and legendary lion stories',
      'wildebeest herds, hyenas, cheetahs, and seasonal crane spectacles',
      'Fly in or long drives via Mongu into the Barotse floodplains edge',
      'migration game drives, walking, and photographic wilderness camps'
    ),
    p(
      'Lochinvar National Park',
      'Kafue Flats south of Monze',
      'a bird rich floodplain park centered on the Chunga Lagoon',
      'Kafue lechwe, zebra, and enormous seasonal waterbird concentrations',
      'Reached from Monze or Lusaka for flats day trips',
      'birding, lechwe viewing, and Gwisho hot springs visits'
    ),
    p(
      'Lower Zambezi National Park',
      'Southern Zambia along the Zambezi River',
      'a river focused wilderness ideal for canoeing and boat based game viewing',
      'elephants, hippos, lions, buffalo, and prolific birdlife along channels',
      'Fly in camps from Lusaka are the practical route',
      'canoe safaris, boat cruises, fishing, and walking safaris'
    ),
    p(
      'Luambe National Park',
      'Eastern Zambia in the Luangwa Valley',
      'a quieter Luangwa park between South and North Luangwa circuits',
      'elephants, hippos, lions, and classic Luangwa birdlife',
      'Road links via Mfuwe or the eastern escarpment routes',
      'game drives and walking in a low density setting'
    ),
    p(
      'Lukusuzi National Park',
      'Eastern Zambia near the Malawi border',
      'a remote Luangwa escarpment park of rugged hills and miombo',
      'elephants moving through corridors, antelope, and woodland birds',
      'Specialist overland access from the Chipata region',
      'wilderness driving and corridor conservation focused visits'
    ),
    p(
      'Lusaka National Park',
      'On the edge of Lusaka',
      'a small city edge park for quick wildlife introductions near the capital',
      'white rhinos in protected areas, giraffe, zebra, and antelope',
      'Minutes from Lusaka, suited to arrival or departure days',
      'short game drives and rhino viewing'
    ),
    p(
      'Lusenga Plain National Park',
      'Northern Zambia near Lake Mweru',
      'a remote plain and woodland park little developed for tourism',
      'antelope herds, buffalo, and waterbirds on seasonal plains',
      'Reached via Kawambwa on specialist northern Zambia routes',
      'remote game viewing and wilderness exploration'
    ),
    p(
      'Mosi-oa-Tunya National Park',
      'Livingstone, southern Zambia',
      'protects the Zambian side of Victoria Falls and a riverside wildlife park',
      'white rhinos in the park section, zebra, giraffe, and falls rainforest birds',
      'Livingstone town is the gateway with falls walkways and park drives',
      'falls visits, rhino tracking, and Zambezi river activities'
    ),
    p(
      'Mweru Wantipa National Park',
      'Northern Zambia near Lakes Mweru and Wantipa',
      'a remote northern park of lakes, swamps, and miombo woodland',
      'wetland birds, antelope, and recovering larger mammal populations',
      'Specialist access via northern Zambia road networks',
      'lakeshore birding and remote wilderness travel'
    ),
    p(
      'North Luangwa National Park',
      'Eastern Zambia',
      'a wild walking safari heartland with fewer vehicles than the south',
      'lions, wild dogs, elephants, Cookson\'s wildebeest, and rich birdlife',
      'Fly in camps from Lusaka or links via Mpika',
      'walking safaris, game drives, and true wilderness camps'
    ),
    p(
      'Nsumbu National Park',
      'Northern Zambia on Lake Tanganyika',
      'a lakeshore park of sandy bays, escarpment forest, and clear water',
      'elephants, buffalo, puku, and excellent lake and woodland birds',
      'Accessed via Kasama or lake transfers to Ndole Bay style bases',
      'game drives, snorkeling, fishing, and beach wilderness time'
    ),
    p(
      'Nyika National Park',
      'Northern Zambia on the Malawi border',
      'Zambia\'s highland share of the Nyika Plateau grasslands',
      'zebra, eland, roan, and montane wildflowers in season',
      'Linked with Malawi\'s Nyika via plateau border approaches',
      'highland game drives, walking, and wildflower season visits'
    ),
    p(
      'Sioma Ngwezi National Park',
      'Southwestern Zambia near the Angola and Namibia borders',
      'a remote Kalahari sand park in the Zambezi Region wildlife corridor',
      'elephants, lions, wild dogs, and dry country antelope',
      '4x4 access via Sesheke or Sioma on specialist itineraries',
      'wilderness game drives and corridor safari circuits'
    ),
    p(
      'South Luangwa National Park',
      'Eastern Zambia',
      'the birthplace of the walking safari and a predator rich Luangwa Valley park',
      'leopards, lions, elephants, wild dogs, and exceptional birdlife',
      'Flights into Mfuwe connect from Lusaka or regional hubs',
      'walking safaris, night drives, and classic game drives'
    ),
    p(
      'West Lunga National Park',
      'Northwestern Zambia',
      'a remote park of cryptosepalum forest and the West Lunga River',
      'forest antelope, primates, and specialized woodland birds',
      'Specialist access via Mwinilunga on far northwest routes',
      'forest walks, river exploration, and remote camping'
    ),
  ],
  Zimbabwe: [
    p(
      'Chimanimani National Park',
      'Eastern Highlands, Zimbabwe',
      'a rugged quartzite mountain park of gorges, waterfalls, and border trails',
      'eland, bushbuck, and highland birds rather than classic savannah game',
      'Accessed via Chimanimani village with hiking hut networks',
      'mountain trekking, gorge walks, and highland camping'
    ),
    p(
      'Chizarira National Park',
      'Northwestern Zimbabwe above the Zambezi escarpment',
      'a dramatic escarpment wilderness known for walking and big views',
      'elephants, lions, sable, and escarpment birdlife',
      'Remote road or charter access via Binga region routes',
      'walking safaris, escarpment viewpoints, and remote drives'
    ),
    p(
      'Gonarezhou National Park',
      'Southeastern Zimbabwe',
      'a vast wilderness of red cliffs, the Save and Runde rivers, and elephant country',
      'elephants, wild dogs, lions, nyala, and rich riverine birdlife',
      'Accessed via Chiredzi or linked with Kruger and Limpopo TFCA routes',
      'game drives, walking, and Chilojo Cliffs photography'
    ),
    p(
      'Hwange National Park',
      'Western Zimbabwe',
      'Zimbabwe\'s flagship wildlife park with famous pumped waterholes and elephant gatherings',
      'elephants, lions, wild dogs, buffalo, and rich birdlife',
      'Victoria Falls and Hwange airstrips are the main access points',
      'game drives, hide sittings, and walking safaris'
    ),
    p(
      'Kazuma Pan National Park',
      'Northwestern Zimbabwe near Botswana',
      'an open pan park on wildlife corridors between Hwange and Chobe country',
      'elephants, buffalo, Roan, and seasonal pan gatherings',
      'Often visited from Hwange or Victoria Falls circuits with 4x4 access',
      'pan game viewing and corridor safari drives'
    ),
    p(
      'Mana Pools National Park',
      'Northern Zimbabwe on the Zambezi',
      'a UNESCO site known for canoeing and close walking encounters with wildlife',
      'elephants, lions, wild dogs, hippos, and floodplain herds',
      'Usually reached by air charter from Harare or Kariba',
      'canoe safaris, walking safaris, and canoe camping'
    ),
    p(
      'Matobo National Park',
      'Southern Zimbabwe near Bulawayo',
      'a granite kopje landscape with rhino tracking and ancient rock art',
      'black and white rhinos, klipspringer, and balanced predator prey systems',
      'A short drive from Bulawayo into the Matobo Hills',
      'rhino tracking on foot, rock art visits, and scenic drives'
    ),
    p(
      'Matusadona National Park',
      'Southern shore of Lake Kariba',
      'a lakeshore and escarpment park of elephants against Kariba sunsets',
      'elephants, lions, buffalo, hippos, and lakeshore birds',
      'Boat or light aircraft access from Kariba town',
      'boat safaris, game drives, and fishing combinations'
    ),
    p(
      'Nyanga National Park',
      'Eastern Highlands, Zimbabwe',
      'Zimbabwe\'s oldest national park of trout streams, waterfalls, and Mount Nyangani',
      'antelope, samango monkeys, and highland birdlife',
      'Reached via Nyanga town from Harare highland routes',
      'hiking, waterfall visits, and cool climate lodge stays'
    ),
    p(
      'Victoria Falls National Park',
      'Western Zimbabwe',
      'protects the Zimbabwean side of Victoria Falls and rainforest spray paths',
      'rainforest birds, antelope near the falls, and Zambezi riverside game in adjoining areas',
      'Victoria Falls town is the gateway with walkways to the falls viewpoints',
      'falls walks, Zambezi cruises, and adventure activities'
    ),
    p(
      'Zambezi National Park',
      'Upstream of Victoria Falls, Zimbabwe',
      'riverside woodland and savannah along the Zambezi above the falls',
      'elephants, buffalo, giraffe, lions, and river birds',
      'Minutes from Victoria Falls town along the Zambezi Drive',
      'game drives, river cruises, and canoeing'
    ),
  ],
  'South Africa': [
    p(
      'Richtersveld National Park',
      'Northern Cape on the Namibia border',
      'South Africa\'s section of the |Ai-|Ais/Richtersveld Transfrontier Park of desert mountains',
      'klipspringer, desert reptiles, and extraordinary succulent plant diversity',
      '4x4 access via Sendelingsdrift on the Orange River',
      'desert hiking, scenic 4x4 trails, and Orange River canoe links'
    ),
    p(
      'Addo Elephant National Park',
      'Eastern Cape, South Africa',
      'a Big Seven park protecting elephants and coastal sections with whales and sharks offshore',
      'elephants, lions, buffalo, rhinos, and spekboom thicket species',
      'Near Gqeberha with easy road access for Eastern Cape circuits',
      'game drives, unique flora viewing, and coastal extensions'
    ),
    p(
      'Agulhas National Park',
      'Southernmost tip of Africa',
      'where the Atlantic and Indian oceans meet at Cape Agulhas',
      'fynbos flora, coastal birds, and rare southern tip landscapes',
      'Reached via the Overberg from Cape Town or Hermanus routes',
      'lighthouse visits, fynbos walks, and shipwreck coast exploration'
    ),
    p(
      'Augrabies Falls National Park',
      'Northern Cape on the Orange River',
      'a desert park where the Orange River thunders through a granite gorge',
      'klipspringer, dassies, and arid adapted birds along the canyon',
      'Accessed via Upington into the Augrabies region',
      'falls viewpoints, canyon walks, and night sky viewing'
    ),
    p(
      'Bontebok National Park',
      'Western Cape near Swellendam',
      'a small fynbos park created to save the bontebok from extinction',
      'bontebok, Cape mountain zebra, and Overberg fynbos birds',
      'A short drive from Swellendam on the Garden Route approaches',
      'game viewing drives and fynbos walks'
    ),
    p(
      'Camdeboo National Park',
      'Eastern Cape around Graaff-Reinet',
      'the Valley of Desolation and Karoo plains wrapped around a historic town',
      'Cape mountain zebra, kudu, and classic Karoo wildlife',
      'Graaff-Reinet is the gateway with viewpoints above the valley',
      'Valley of Desolation sunsets, game drives, and Karoo walks'
    ),
    p(
      'Garden Route National Park',
      'Western and Eastern Cape coast',
      'a mosaic of forests, lakes, and coastline from Wilderness to Tsitsikamma',
      'forest birds, knysna louries, seals offshore, and fynbos specialists',
      'Multiple sections accessed via George, Knysna, and Storms River',
      'hiking, kayaking, Storms River suspension bridge, and forest trails'
    ),
    p(
      'Golden Gate Highlands National Park',
      'Free State Drakensberg foothills',
      'sandstone cliffs of gold and orange light with highland grasslands',
      'black wildebeest, eland, zebra, and highland birds',
      'Reached via Clarens or Harrismith highland routes',
      'scenic drives, hiking, and sandstone photography'
    ),
    p(
      'Karoo National Park',
      'Western Cape near Beaufort West',
      'a classic Great Karoo park of dolerite ridges and desert adapted game',
      'black rhino, lion in managed sections, springbok, and Karoo birds',
      'Just off the N1 at Beaufort West for Cape to Johannesburg routes',
      'game drives, fossil trails, and night drives'
    ),
    p(
      'Kgalagadi Transfrontier Park',
      'Northern Cape on the Botswana border',
      'red dunes and dry riverbeds shared with Botswana\'s Kgalagadi',
      'black maned lions, meerkats, oryx, springbok, and raptors',
      'Entered via Twee Rivieren with rest camps along the Auob and Nossob',
      'predator game drives and dune road self drive circuits'
    ),
    p(
      'Kruger National Park',
      'Mpumalanga and Limpopo, South Africa',
      'South Africa\'s most famous Big Five park with an extensive rest camp network',
      'Big Five game, wild dogs, cheetahs, and outstanding birding',
      'Multiple gates including Kruger Mpumalanga Airport and road access from Johannesburg',
      'self drive or guided game drives, bush walks, and night drives'
    ),
    p(
      'Mapungubwe National Park',
      'Limpopo at the Zimbabwe and Botswana confluence',
      'a UNESCO cultural landscape of sandstone ridges and ancient kingdom sites',
      'elephants, eland, and riverine wildlife along the Limpopo',
      'Accessed via Musina with lodge and SANParks camp options',
      'heritage site visits, game drives, and confluence viewpoints'
    ),
    p(
      'Marakele National Park',
      'Limpopo in the Waterberg',
      'a Waterberg mountain park of cliffs, vultures, and Big Five game',
      'elephants, rhinos, Cape vultures on nesting cliffs, and antelope',
      'About a three to four hour drive from Johannesburg via Thabazimbi',
      'mountain game drives, hide visits, and scenic viewpoints'
    ),
    p(
      'Mokala National Park',
      'Northern Cape south of Kimberley',
      'a conservation park for rare antelope and arid savannah species',
      'roan, tsessebe, black rhino, and arid adapted plains game',
      'Reached from Kimberley for Northern Cape circuits',
      'game drives and rare antelope focused viewing'
    ),
    p(
      'Mountain Zebra National Park',
      'Eastern Cape near Cradock',
      'a Karoo mountain park that helped save the Cape mountain zebra',
      'Cape mountain zebra, cheetah, buffalo, and Karoo antelope',
      'Accessed via Cradock on Eastern Cape inland routes',
      'game drives, hiking, and cheetah tracking where offered'
    ),
    p(
      'Namaqua National Park',
      'Northern Cape Namaqualand',
      'a spring flower spectacle park of coastal plains and granite hills',
      'flowering landscapes in season, small desert mammals, and coastal birds',
      'Best visited in flower season via Springbok or Kleinsee approaches',
      'flower drives, coastal 4x4 trails, and wild camping'
    ),
    p(
      'Table Mountain National Park',
      'Cape Town, South Africa',
      'a dramatic urban mountain and peninsula park from Table Mountain to Cape Point',
      'fynbos flora, dassies, seabirds, and marine life along the peninsula',
      'Accessed directly from Cape Town with cableway and scenic drives',
      'hiking, Cape Point visits, penguin colonies, and peninsula touring'
    ),
    p(
      'Tankwa Karoo National Park',
      'Northern and Western Cape border',
      'a stark, silent Karoo wilderness of huge skies and desert plains',
      'springbok, gemsbok, and arid birdlife across open plains',
      'Remote access via Ceres or Calvinia with self catering wilderness camps',
      'stargazing, scenic drives, and desert photography'
    ),
    p(
      'West Coast National Park',
      'Atlantic coast north of Cape Town',
      'lagoon, fynbos, and spring flower country around Langebaan',
      'flamingos, waders, antelope, and seasonal flower fields',
      'An easy day trip from Cape Town via Langebaan',
      'birding, Postberg flower drives in season, and lagoon viewpoints'
    ),
    p(
      'Pilanesberg National Park',
      'North West Province, South Africa',
      'an extinct volcanic crater reserve convenient to Johannesburg and Pretoria',
      'Big Five animals in a compact crater landscape',
      'About a two to three hour drive from Johannesburg',
      'game drives, hot air balloons in season, and short safari breaks'
    ),
    p(
      'Meerkat National Park',
      'Northern Cape near Carnarvon',
      'a dark sky park protecting the Square Kilometre Array landscape and arid wildlife',
      'meerkats, springbok, and desert adapted small mammals under exceptional night skies',
      'Accessed via Carnarvon in the deep Karoo',
      'stargazing, meerkat viewing, and arid landscape drives'
    ),
  ],
  'DR Congo': [
    p(
      'Virunga National Park',
      'Eastern DR Congo',
      'Africa\'s oldest national park and a Virunga stronghold for mountain gorillas and active volcanoes',
      'mountain gorillas, chimpanzees, forest elephants, and highland fauna',
      'Goma is the usual gateway with permits and security briefings required',
      'gorilla trekking, Nyiragongo crater hike, and community conservation visits'
    ),
    p(
      'Kahuzi Biega National Park',
      'South Kivu, DR Congo',
      'a UNESCO park protecting eastern lowland gorillas in misty highland forest',
      'eastern lowland gorillas, forest birds, and primate diversity',
      'Accessed via Bukavu with specialist guiding and current travel advice',
      'lowland gorilla trekking and forest walks'
    ),
    p(
      'Garamba National Park',
      'Northeastern DR Congo',
      'a vast savannah and woodland park on the frontier of Central African wildlife',
      'elephants, giraffes, buffalo, and recovering large mammal populations',
      'Specialist access only with current security and conservation partners',
      'conservation focused safari visits where operations allow'
    ),
    p(
      'Salonga National Park',
      'Central Congo Basin',
      'Africa\'s largest tropical rainforest national park and a UNESCO World Heritage site',
      'bonobos, forest elephants, bongos, and Congo Basin birdlife',
      'Extremely remote river access via specialist scientific or conservation trips',
      'river expeditions and primate focused forest exploration'
    ),
    p(
      'Upemba National Park',
      'Southeastern DR Congo',
      'a landscape of lakes, plateaus, and miombo woodland in Katanga',
      'antelope, hippos on lakes, and wetland birds across Upemba depression',
      'Reached via Lubumbashi region routes on specialist itineraries',
      'lakeshore exploration and highland to wetland circuits'
    ),
    p(
      'Kundelungu National Park',
      'Southeastern DR Congo',
      'a plateau park known for Lofoi Falls and open Katanga grasslands',
      'antelope herds, primates in gallery forest, and waterfall scenery',
      'Accessed from Lubumbashi toward the Kundelungu plateau',
      'waterfall visits, plateau drives, and scenic walking'
    ),
    p(
      'Maiko National Park',
      'Eastern DR Congo rainforest',
      'a remote lowland forest park protecting Congo endemic megafauna',
      'okapi, eastern lowland gorillas, forest elephants, and Congo peafowl',
      'Specialist research style access only through conservation partners',
      'primate and okapi focused forest expeditions where permitted'
    ),
    p(
      'Lomami National Park',
      'Central DR Congo',
      'a newer Congo Basin park protecting bonobos and intact rainforest blocks',
      'bonobos, forest elephants, monkeys, and intact canopy birdlife',
      'River based specialist access via conservation programs',
      'bonobo tracking and rainforest river travel'
    ),
    p(
      'Mangroves National Park',
      'Atlantic coast of DR Congo',
      'a coastal mangrove and marine park at the mouth of the Congo system',
      'manatees, coastal birds, fish nurseries, and mangrove fauna',
      'Accessed via Muanda on the Congo coast with local guiding',
      'boat trips through mangroves and coastal birding'
    ),
  ],
  Ethiopia: [
    p(
      'Abijatta-Shalla National Park',
      'Rift Valley lakes south of Addis Ababa',
      'twin crater lakes of flamingos, hot springs, and Rift Valley birdlife',
      'great white pelicans, flamingos, and dry country mammals on lake shores',
      'An easy drive from Addis Ababa or Hawassa on Rift Valley routes',
      'birding, hot spring visits, and lakeshore walks'
    ),
    p(
      'Alatish National Park',
      'Northwestern Ethiopia on the Sudan border',
      'a remote lowland wilderness of seasonal rivers and Sudan-Ethiopia wildlife links',
      'elephants in corridor years, antelope, and dry country birds',
      'Specialist access via Gondar region borderland routes',
      'remote game viewing and wilderness exploration'
    ),
    p(
      'Arsi Mountains National Park',
      'South-central Ethiopian highlands',
      'an afro alpine mountain park protecting highland endemics east of the Rift',
      'mountain nyala, Menelik\'s bushbuck, and highland birds',
      'Reached via Asella from Addis Ababa highland roads',
      'highland trekking and endemic mammal viewing'
    ),
    p(
      'Awash National Park',
      'Afar and Oromia regions, Ethiopia',
      'a Rift Valley park of dry savannah, falls, and arid adapted wildlife',
      'oryx, soemmerring\'s gazelle, baboons, and dry country birds',
      'A few hours east of Addis Ababa on the Djibouti road corridor',
      'game drives, Awash Falls visits, and birding'
    ),
    p(
      'Bejimiz National Park',
      'Southwestern Ethiopia near South Sudan',
      'a remote western lowland park in Ethiopia\'s wetter border forests',
      'buffalo, antelope, primates, and West Ethiopian forest birds',
      'Specialist access via Gambela region networks',
      'forest and savannah exploration on expedition style trips'
    ),
    p(
      'Borana National Park',
      'Southern Ethiopia in Borana country',
      'a southern savannah and acacia park on cultural and wildlife frontiers',
      'dry country antelope, predators in low densities, and arid birds',
      'Reached via Yabelo or Moyale corridor routes',
      'game drives and Borana cultural combinations'
    ),
    p(
      'Bale Mountains National Park',
      'Southeastern Ethiopia',
      'a high altitude park of Sanetti Plateau moorlands and rare Ethiopian wolves',
      'Ethiopian wolves, mountain nyala, Menelik\'s bushbuck, and endemic birds',
      'Reached via Dinsho or Goba from Addis Ababa',
      'wolf tracking, plateau drives, and highland hiking'
    ),
    p(
      'Chebera Churchura National Park',
      'Southwestern Ethiopia',
      'an emerging park of dense forest and grassland with strong elephant numbers',
      'elephants, buffalo, hippos, and forest edge primates',
      'Accessed via Jimma or Sodo region roads on guided trips',
      'forest game walks and elephant focused viewing'
    ),
    p(
      'Dati Wolel National Park',
      'Western Ethiopia',
      'a western woodland and river park protecting lowland wildlife blocks',
      'buffalo, antelope, primates, and riverine birds',
      'Reached via Nekemte area routes on specialist itineraries',
      'woodland game viewing and river exploration'
    ),
    p(
      'Didessa National Park',
      'Western Ethiopia along the Didessa River',
      'a riverine and woodland park in Ethiopia\'s coffee growing west',
      'buffalo, hippos, antelope, and rich western birdlife',
      'Accessed via Jimma or Nekemte corridors',
      'river focused wildlife viewing and birding'
    ),
    p(
      'Gambela National Park',
      'Western Ethiopia near South Sudan',
      'a vast lowland park of grasslands and one of Africa\'s great antelope migrations',
      'white eared kob in season, Nile lechwe, elephants, and wetland birds',
      'Fly or drive via Gambela town with seasonal access constraints',
      'migration viewing, river travel, and remote savannah safaris'
    ),
    p(
      'Geralle National Park',
      'Somali Region, eastern Ethiopia',
      'an arid eastern park of volcanic landscapes and desert adapted wildlife',
      'Beisa oryx, gerenuk, Grevy\'s zebra in the wider region, and dry country birds',
      'Specialist access via Jijiga or borderland routes',
      'desert game drives and arid landscape photography'
    ),
    p(
      'Gibe Sheleko National Park',
      'Southwestern Ethiopia along the Gibe River',
      'a gorge and woodland park where the Gibe cuts dramatic highland scenery',
      'hippos, primates, antelope, and cliff nesting birds',
      'Reached via Wolkite or Jimma road networks',
      'gorge viewpoints, river walks, and birding'
    ),
    p(
      'Kafta Sheraro National Park',
      'Northern Ethiopia near Eritrea',
      'a northern wilderness important for elephants and dry season river concentrations',
      'elephants, antelope, and dry country birds along the Tekeze system',
      'Accessed via Shire on northern Ethiopia routes with local guidance',
      'elephant tracking and remote northern wilderness travel'
    ),
    p(
      'Loka-Abaya National Park',
      'Southern Rift Valley, Ethiopia',
      'a Rift Valley park of lakeshore woodland and open savannah near Lake Abaya',
      'buffalo, hippos, antelope, and Rift Valley waterbirds',
      'Reached via Arba Minch on southern Ethiopia circuits',
      'game drives and lakeshore birding'
    ),
    p(
      'Mao-Komo National Park',
      'Western Ethiopia on the South Sudan border',
      'a remote western border park of forests and lowland wildlife',
      'buffalo, antelope, primates, and western forest birds',
      'Specialist access via Assosa region routes',
      'borderland wilderness exploration'
    ),
    p(
      'Mago National Park',
      'Southern Ethiopia near the Omo',
      'a southern park of savannah and riverine forest in the lower Omo basin',
      'buffalo, kudu, elephants in low densities, and dry country birds',
      'Often combined with Omo Valley cultural circuits via Jinka',
      'game drives and Omo cultural combinations'
    ),
    p(
      'Maze National Park',
      'Southern Ethiopia',
      'a grassland park known for significant populations of the rare Swayne\'s hartebeest',
      'Swayne\'s hartebeest, buffalo, and open country birds',
      'Accessed via Sawla or Arba Minch region roads',
      'hartebeest focused game drives and grassland walks'
    ),
    p(
      'Nechisar National Park',
      'Southern Rift Valley between Lakes Abaya and Chamo',
      'the Bridge of God isthmus park of savannah, hot springs, and lake shores',
      'zebra, Grant\'s gazelle, crocodiles on Lake Chamo, and rich birdlife',
      'Arba Minch is the gateway for boat and park drives',
      'game drives, boat trips to crocodile markets, and hot spring visits'
    ),
    p(
      'Omo National Park',
      'Southwestern Ethiopia',
      'a remote wilderness on the Omo River with savannah and riverine habitats',
      'eland, buffalo, elephants in low densities, and river birds',
      'Specialist access via southern Ethiopia expedition routes',
      'river exploration and remote savannah game viewing'
    ),
    p(
      'Simien Mountains National Park',
      'Northern Ethiopia',
      'a dramatic highland escarpment park and UNESCO site of afro alpine scenery',
      'gelada monkeys, Walia ibex, Ethiopian wolves in the wider highlands, and cliff nesting birds',
      'Gondar is the main gateway for trek logistics',
      'trekking, gelada encounters, and escarpment viewpoints'
    ),
    p(
      'Yangudi Rassa National Park',
      'Afar Region, eastern Ethiopia',
      'an arid Afar park created to protect African wild ass habitat',
      'African wild ass in the wider region, Soemmerring\'s gazelle, and desert birds',
      'Specialist access on Afar overland routes east of Awash',
      'arid wildlife viewing and desert landscape travel'
    ),
  ],
  Malawi: [
    p(
      'Kasungu National Park',
      'Central Malawi',
      'a miombo woodland park with recovering wildlife north of Lilongwe',
      'elephants, antelope, and woodland birds across open miombo',
      'A few hours from Lilongwe toward the Zambian border',
      'game drives and quiet woodland safari time'
    ),
    p(
      'Lake Malawi National Park',
      'Southern Lake Malawi around Cape Maclear',
      'a UNESCO freshwater park of crystal bays, islands, and cichlid reefs',
      'colorful mbuna cichlids, fish eagles, and lakeshore birds',
      'Reached via Monkey Bay with canoe and snorkel bases at Cape Maclear',
      'snorkeling, island hopping, kayaking, and village visits'
    ),
    p(
      'Lengwe National Park',
      'Lower Shire Valley, southern Malawi',
      'a dry thicket park known for nyala in dense woodland',
      'nyala, suni, buffalo, and thicket bird specialists',
      'Accessed from Blantyre into the Lower Shire',
      'game drives and hide viewing'
    ),
    p(
      'Liwonde National Park',
      'Southern Malawi',
      'Malawi\'s premier wildlife park along the Upper Shire River',
      'elephants, hippos, rhinos in sanctuary areas, crocs, and rich birdlife',
      'Reached from Lilongwe or Blantyre with boat and road transfers',
      'boat safaris, game drives, walking safaris, and rhino tracking'
    ),
    p(
      'Nyika National Park',
      'Northern Malawi',
      'a high plateau park of rolling grasslands, orchids, and zebra herds',
      'zebra, eland, roan antelope, leopard, and montane birds',
      'Accessed via Livingstonia or Mzuzu with highland lodge stays',
      'game drives, walking, mountain biking, and wildflower season visits'
    ),
    p(
      'Majete Wildlife Reserve',
      'Southern Malawi',
      'a restored Big Five reserve and a conservation success story',
      'lions, elephants, rhinos, buffalo, and leopards',
      'A drive from Blantyre into the Lower Shire valley',
      'game drives, boat trips, and community conservation visits'
    ),
    p(
      'Nkhotakota Wildlife Reserve',
      'Central Malawi on Lake Malawi\'s western shore',
      'a vast miombo reserve revitalized by major elephant translocations',
      'elephants, antelope, and recovering predator populations',
      'Reached from Lilongwe toward the lakeshore interior',
      'walking safaris, game drives, and river explorations'
    ),
    p(
      'Vwaza Marsh Wildlife Reserve',
      'Northern Malawi near Nyika',
      'a marsh and woodland reserve ideal with Nyika highland circuits',
      'elephants, buffalo, hippos at Lake Kazuni, and wetland birds',
      'Often combined with Nyika via Rumphi approaches',
      'lakeside game viewing and birding'
    ),
    p(
      'Mwabvi Wildlife Reserve',
      'Lower Shire Valley, southern Malawi',
      'a small dry reserve of thicket and sandstone outcrops in the far south',
      'nyala, black rhino historically targeted for restoration, and thicket birds',
      'Accessed from Nsanje or Blantyre Lower Shire routes',
      'guided walks and quiet thicket game viewing'
    ),
  ],
  Mozambique: [
    p(
      'Banhine National Park',
      'Gaza Province, Mozambique',
      'a dry inland park of pans and mopane woodland in the Great Limpopo corridor',
      'elephants moving through TFCA routes, antelope, and dry country birds',
      'Specialist 4x4 access on Limpopo Transfrontier circuits',
      'wilderness game drives and pan birding'
    ),
    p(
      'Bazaruto Archipelago National Park',
      'Inhambane Province, Mozambique',
      'a marine park of turquoise channels, dunes, and coral reefs',
      'dugongs, dolphins, turtles, reef fish, and coastal birds',
      'Reached via Vilanculos with boat transfers to island lodges',
      'snorkeling, diving, dhow sails, and island hopping'
    ),
    p(
      'Chimanimani National Park',
      'Manica Province, Mozambique',
      'Mozambique\'s side of the Chimanimani massif of quartzite peaks and montane forest',
      'eland, samango monkeys, and highland endemic birds',
      'Accessed via Chimoio toward the eastern highland border',
      'mountain trekking and highland wilderness camping'
    ),
    p(
      'Gorongosa National Park',
      'Central Mozambique',
      'a rebounding wilderness at the southern end of the Great Rift Valley',
      'lions, elephants, wild dogs, buffalo, and prolific floodplain wildlife',
      'Fly in or drive via Beira and Inchope with specialist camps',
      'game drives, river exploration, and conservation focused itineraries'
    ),
    p(
      'Limpopo National Park',
      'Southwestern Mozambique',
      'Mozambique\'s section of the Great Limpopo Transfrontier Park beside Kruger',
      'elephants, lions, buffalo, and wildlife spilling across TFCA boundaries',
      'Linked with Kruger gates or accessed via Massingir',
      'game drives and transfrontier safari circuits'
    ),
    p(
      'Magoe National Park',
      'Tete Province on Lake Cahora Bassa',
      'a lakeshore and woodland park on the Zambezi hinterland',
      'elephants, buffalo, hippos, and lakeshore birds',
      'Accessed via Tete with lake and bush camp options',
      'game drives, boat trips, and fishing combinations'
    ),
    p(
      'Quirimbas National Park',
      'Cabo Delgado, northern Mozambique',
      'a coastal and island park of mangroves, coral reefs, and historic Ibo',
      'turtles, dugongs, reef fish, and coastal birds across island chains',
      'Fly in via Pemba with dhow or boat transfers to island lodges',
      'diving, dhow sailing, and island cultural visits'
    ),
    p(
      'Zinave National Park',
      'Inhambane Province inland',
      'a recovering mopane and sandveld park restocked within the Limpopo TFCA',
      'elephants, antelope, and returning predator populations',
      'Specialist access on southern Mozambique safari routes',
      'wilderness game drives and conservation tourism visits'
    ),
    p(
      'Maputo Special Reserve',
      'Southern Mozambique',
      'a coastal wilderness of lakes, dunes, and elephant country near Maputo',
      'elephants, hippos, antelope, and wetland birds',
      'Day trips or overnights from Maputo with guided access',
      'game drives, lake visits, and beach wilderness time'
    ),
  ],
  Madagascar: [
    p(
      'Andasibe Mantadia National Park',
      'Eastern Madagascar',
      'the best known rainforest park for indri and other endemic lemurs',
      'indri, diademed sifaka, common brown lemurs, and rainforest frogs',
      'About a four hour drive from Antananarivo',
      'day and night walks, indri calling at dawn, and orchid spotting'
    ),
    p(
      'Isalo National Park',
      'South central Madagascar',
      'a sandstone canyon park of natural pools, massifs, and ring tailed lemur habitat',
      'ring tailed lemurs, Verreaux\'s sifaka, and dry country reptiles',
      'Reached via Toliara or the RN7 corridor with Ranohira as a base',
      'canyon hikes, natural swimming pools, and sunset viewpoints'
    ),
    p(
      'Ranomafana National Park',
      'Southeastern Madagascar',
      'a misty rainforest park famous for golden bamboo lemurs',
      'golden bamboo lemurs, many lemur species, and rich herpetofauna',
      'Accessed from Fianarantsoa on Madagascar\'s highland road network',
      'guided rainforest walks and thermal spring visits nearby'
    ),
    p(
      'Andringitra National Park',
      'Southern highlands of Madagascar',
      'a granite peak and valley park for serious trekking and ring tailed lemurs',
      'ring tailed lemurs in valleys, highland endemics, and dramatic Tsaranoro views',
      'Reached via Ambalavao with trek bases toward Pic Boby',
      'multi day treks, canyon hikes, and village trail culture'
    ),
    p(
      'Ankarafantsika National Park',
      'Northwestern Madagascar',
      'dry deciduous forest lakes and trails on the road to Mahajanga',
      'Coquerel\'s sifaka, mouse lemurs, and lake birdlife at Ravelobe',
      'A stop between Antananarivo and Mahajanga or a Mahajanga day trip',
      'forest walks, night walks, and lake birding'
    ),
    p(
      'Ankarana National Park',
      'Northern Madagascar',
      'a limestone tsingy massif of caves, canyons, and dry forest lemurs',
      'crowned lemurs, Sanford\'s brown lemurs, and cave bat colonies',
      'Accessed via Anivorano or Diego Suarez northern circuits',
      'tsingy walks, cave visits, and canyon trails'
    ),
    p(
      'Montagne d\'Ambre National Park',
      'Northern Madagascar near Antsiranana',
      'a volcanic rainforest mountain of waterfalls and endemic northern flora',
      'crowned lemurs, Sanford\'s brown lemurs, and rainforest reptiles',
      'A short drive from Diego Suarez into highland trailheads',
      'waterfall hikes, crater lake walks, and night walks'
    ),
    p(
      'Masoala National Park',
      'Northeastern Madagascar',
      'the island\'s largest protected rainforest, reaching from mountains to marine edges',
      'red ruffed lemurs, tomato frogs, and exceptional coastal rainforest life',
      'Boat access from Maroantsetra to forest lodges is typical',
      'forest walks, coastal kayaking, and Aye aye night searches nearby'
    ),
    p(
      'Tsingy de Bemaraha National Park',
      'Western Madagascar',
      'a UNESCO labyrinth of razor limestone towers above dry forest',
      'Decken\'s sifaka, lemurs in canyons, and specialized cliff fauna',
      'Reached via Morondava and Bekopaka with seasonal road limits',
      'suspended bridge tsingy circuits and gorge walks'
    ),
    p(
      'Andohahela National Park',
      'Southeastern Madagascar near Tolagnaro',
      'where rainforest and spiny forest meet across a short mountain divide',
      'Collared brown lemurs, sifakas, and extreme habitat contrast flora',
      'Day trips from Fort Dauphin into multiple park parcels',
      'rainforest and spiny forest walks in one park system'
    ),
    p(
      'Zombitse Vohibasia National Park',
      'Southwestern Madagascar on the RN7',
      'a dry forest birding hotspot between Isalo and Toliara',
      'Appert\'s tetraka, Verreaux\'s sifaka, and dry forest specialists',
      'A convenient RN7 stop near Sakaraha',
      'guided birding walks and lemur spotting'
    ),
    p(
      'Kirindy Mitea National Park',
      'Western Madagascar south of Morondava',
      'coastal dry forest and mangrove park near the Avenue of the Baobabs region',
      'lemurs, fossa in the wider dry forests, and coastal birds',
      'Accessed via Morondava with coastal and forest trail options',
      'dry forest walks, mangrove visits, and baobab combinations'
    ),
    p(
      'Tsimanampetsotsa National Park',
      'Southwestern Madagascar',
      'a surreal saline lake and limestone park in the spiny forest belt',
      'ring tailed lemurs, radiated tortoises, flamingos on the lake, and cave fauna',
      'Reached south of Toliara on 4x4 spiny forest routes',
      'lake birding, cave visits, and spiny forest walks'
    ),
    p(
      'Baie de Baly National Park',
      'Northwestern Madagascar',
      'a coastal park protecting the last wild ploughshare tortoises and dry forest',
      'ploughshare tortoises in protected zones, lemurs, and coastal birds',
      'Specialist access via Soalala on northwestern circuits',
      'tortoise conservation visits and dry forest walks'
    ),
    p(
      'Marojejy National Park',
      'Northeastern Madagascar',
      'a steep rainforest massif and UNESCO site famous for silky sifaka trekking',
      'silky sifakas, helmet vangas in the region, and mossy mountain forest',
      'Accessed via Andapa with multi day hut based climbs',
      'summit treks and silky sifaka tracking'
    ),
    p(
      'Nosy Hara National Park',
      'Marine park northwest of Antsiranana',
      'an archipelago of sculpted limestone islets and clear snorkel channels',
      'reef fish, turtles, and nesting seabirds on remote islets',
      'Boat expeditions from Diego Suarez into the archipelago',
      'snorkeling, island camping, and kayaking'
    ),
    p(
      'Lokobe National Park',
      'Nosy Be, northwestern Madagascar',
      'the last primary forest on Nosy Be and a classic black lemur reserve',
      'black lemurs, Nosy Be endemics, and coastal forest reptiles',
      'Boat or road access from Hell Ville on Nosy Be',
      'guided forest walks and black lemur encounters'
    ),
    p(
      'Zahamena National Park',
      'Eastern Madagascar',
      'a large eastern rainforest block and UNESCO biosphere of high biodiversity',
      'indri, black and white ruffed lemurs, and exceptional bird lists',
      'Accessed via Ambatondrazaka on less traveled eastern routes',
      'rainforest trekking and endemic birding'
    ),
    p(
      'Midongy du Sud National Park',
      'Southeastern Madagascar',
      'a remote rainforest park of ridges and rivers in the far southeast',
      'lemurs, rainforest frogs, and southeastern endemic birds',
      'Specialist access via Midongy or Vangaindrano corridors',
      'expedition style forest trekking'
    ),
    p(
      'Cap Sainte Marie National Park',
      'Southernmost Madagascar',
      'windswept cliffs and spiny scrub at Madagascar\'s southern cape',
      'radiated tortoises, coastal birds, and stark southern flora',
      'Reached via Tsihombe on southern spiny forest itineraries',
      'cape viewpoints, tortoise viewing, and coastal walks'
    ),
  ],
  Seychelles: [
    p(
      'Morne Seychellois National Park',
      'Mahe, Seychelles',
      'the largest national park in Seychelles, covering misty mountains and coastal forest',
      'endemic birds, fruit bats, and lush island flora',
      'Reached by road from Victoria with trailheads across Mahe',
      'hiking, waterfall walks, and scenic mountain viewpoints'
    ),
    p(
      'Curieuse Marine National Park',
      'Near Praslin, Seychelles',
      'an island and marine park known for giant tortoises and shallow reefs',
      'giant tortoises, reef fish, turtles, and coastal birds',
      'Boat excursions from Praslin are the standard approach',
      'snorkeling, tortoise encounters, and island walks'
    ),
    p(
      'Ste Anne Marine National Park',
      'Offshore Victoria, Mahe',
      'a near shore island and reef park minutes from the capital',
      'reef fish, turtles, and nesting seabirds on protected islands',
      'Boat trips from Mahe marinas for day snorkeling circuits',
      'snorkeling, island beach time, and glass bottom tours'
    ),
    p(
      'Moyenne Island National Park',
      'Ste Anne group, Mahe',
      'a tiny national park island of jungle paths and free roaming tortoises',
      'giant tortoises, lizards, and fringing reef life',
      'Short boat transfers from Mahe for half day visits',
      'tortoise walks, snorkeling, and island trails'
    ),
    p(
      'Praslin National Park',
      'Praslin, Seychelles',
      'protects highland forest including approaches to the Vallee de Mai palm sanctuary',
      'endemic birds, palm forest flora, and island reptiles',
      'Reached by road from Praslin jetties and island hotels',
      'forest walks and Vallee de Mai combinations'
    ),
    p(
      'Silhouette National Park',
      'Silhouette Island, Seychelles',
      'a mountainous granite island park of mist forest and quiet beaches',
      'endemic plants, fruit bats, and surrounding reef life',
      'Boat or helicopter transfers from Mahe to island lodges',
      'hiking, snorkeling, and island wilderness stays'
    ),
    p(
      'Vallee de Mai Nature Reserve',
      'Praslin, Seychelles',
      'a UNESCO palm forest protecting the legendary coco de mer',
      'black parrots, endemic plants, and dense palm canopy life',
      'A short transfer from Praslin jetties and island hotels',
      'guided palm forest walks and photography'
    ),
  ],
  Egypt: [
    p(
      'Ras Mohammed National Park',
      'South Sinai, Egypt',
      'Egypt\'s flagship marine park at the tip of the Sinai with world class reefs',
      'coral reefs, reef fish, turtles, and Red Sea marine life',
      'Day trips from Sharm El Sheikh are common',
      'snorkeling, diving, and coastal viewpoints'
    ),
    p(
      'White Desert National Park',
      'Western Desert, Egypt',
      'a surreal chalk landscape of wind carved rock formations',
      'desert adapted foxes, birds, and stark geological scenery',
      'Camping circuits from Bahariya Oasis with desert guides',
      'sunset and sunrise photography, desert camping, and 4x4 exploration'
    ),
    p(
      'Wadi El Rayan Protected Area',
      'Faiyum, Egypt',
      'a desert oasis park of lakes, waterfalls, and nearby Wadi Al Hitan fossils',
      'waterbirds, desert gazelles in the wider area, and unique geology',
      'A day trip from Cairo into the Faiyum depression',
      'lake visits, sandboarding nearby, and whale valley excursions'
    ),
    p(
      'Wadi Al Hitan National Park',
      'Faiyum desert, Egypt',
      'UNESCO Whale Valley, where ancient whale fossils lie in open desert',
      'fossil whales and sea life remains, desert foxes, and arid birds',
      'Combined with Wadi El Rayan from Cairo or Faiyum',
      'fossil site walks and desert photography'
    ),
    p(
      'Nabq Protected Area',
      'South Sinai north of Sharm El Sheikh',
      'a coastal park of mangroves, dunes, and shallow reef flats',
      'mangrove fauna, reef fish, and desert gazelles inland',
      'Day trips from Sharm El Sheikh along the Nabq coast',
      'mangrove visits, snorkeling, and desert coastal drives'
    ),
    p(
      'St Katherine Protectorate',
      'South Sinai highlands',
      'a mountain protectorate around Mount Sinai and St Catherine\'s Monastery',
      'Sinai endemic plants, Nubian ibex, and highland birds',
      'Reached via Dahab or Nuweiba into St Katherine town',
      'Mount Sinai sunrise hikes, monastery visits, and mountain walks'
    ),
    p(
      'Gilf Kebir National Park',
      'Southwestern Egypt near Libya and Sudan',
      'a remote plateau of sand seas, canyons, and prehistoric rock art',
      'extreme desert adapted fauna and legendary rock art sites such as the Cave of Swimmers area',
      'Expedition 4x4 circuits from the Western Desert oases only',
      'rock art expeditions and deep desert camping'
    ),
    p(
      'Lake Qarun Protected Area',
      'Faiyum, Egypt',
      'an ancient lake basin of birdlife and desert edge archaeology',
      'wintering waterbirds, flamingos in season, and lakeshore wildlife',
      'Day trips from Cairo into the Faiyum depression',
      'birding, lakeshore viewpoints, and heritage site combinations'
    ),
    p(
      'Siwa Protected Area',
      'Western Desert oasis, Egypt',
      'an oasis protectorate of salt lakes, palms, and desert culture on the Libyan edge',
      'desert foxes, migratory birds, and oasis wetland life',
      'Flights or long drives to Siwa Oasis with local desert guides',
      'salt lake visits, dune excursions, and oasis heritage walks'
    ),
    p(
      'Red Sea Islands Protected Area',
      'Egyptian Red Sea offshore',
      'a chain of protected islands and reefs crucial for nesting birds and diving',
      'nesting seabirds, turtles, and rich coral reef communities',
      'Boat and liveaboard access from Hurghada or southern Red Sea ports',
      'diving, snorkeling, and seabird island viewing where permitted'
    ),
  ],
  Morocco: [
    p(
      'Toubkal National Park',
      'High Atlas, Morocco',
      'home to Mount Toubkal, North Africa\'s highest peak, and Berber mountain villages',
      'Barbary sheep, birds of prey, and alpine flora',
      'Imlil is the main trailhead from Marrakech',
      'summit treks, village walks, and mule supported hiking'
    ),
    p(
      'Ifrane National Park',
      'Middle Atlas, Morocco',
      'a cedar forest park famous for Barbary macaques around Azrou',
      'Barbary macaques, cedar woodland birds, and highland scenery',
      'Easily reached from Fes or Meknes via Ifrane',
      'forest walks, macaque viewing, and cool climate escapes'
    ),
    p(
      'Souss Massa National Park',
      'Atlantic coast near Agadir',
      'a coastal park protecting estuaries, dunes, and rare northern bald ibis habitat',
      'northern bald ibis, flamingos, gazelles in reserves, and shorebirds',
      'Day trips from Agadir along the Souss and Massa rivers',
      'birding, coastal walks, and photography'
    ),
    p(
      'Talassemtane National Park',
      'Rif Mountains, northern Morocco',
      'a limestone and fir forest park above Chefchaouen\'s blue medina country',
      'Barbary macaques, birds of prey, and Rif mountain flora',
      'Trailheads from Chefchaouen into Talassemtane valleys',
      'gorge hikes, waterfall walks, and mountain village trails'
    ),
    p(
      'Al Hoceima National Park',
      'Mediterranean coast, northern Morocco',
      'cliffs, islets, and marine waters on Morocco\'s Rif coastline',
      'ospreys, seabirds, and Mediterranean marine life',
      'Accessed via Al Hoceima with coastal trail and boat options',
      'coastal hiking, boat trips, and birding'
    ),
    p(
      'Iriqui National Park',
      'Southern Morocco near the Algerian border',
      'a Sahara edge park of seasonal lake flats and desert plains',
      'desert gazelles, sandgrouse, and migratory waterbirds when the lake floods',
      'Reached via Zagora or M\'Hamid on desert circuits',
      'desert 4x4 travel and seasonal lake birding'
    ),
    p(
      'Haut Atlas Oriental National Park',
      'Eastern High Atlas, Morocco',
      'an eastern High Atlas park of cedar slopes and highland plateaus',
      'Barbary sheep, raptors, and montane woodland birds',
      'Accessed via Midelt or the eastern Atlas road network',
      'highland hiking and scenic mountain drives'
    ),
    p(
      'Khenifiss National Park',
      'Atlantic Sahara coast, southern Morocco',
      'a coastal lagoon park of dunes, wetlands, and Sahara shorebirds',
      'flamingos, waders, and desert adapted coastal fauna',
      'Reached via Tan Tan on the southern Atlantic road',
      'lagoon birding and coastal desert walks'
    ),
    p(
      'Dakhla National Park',
      'Dakhla peninsula, Western Sahara coast',
      'a vast coastal and desert park of lagoons, dunes, and Atlantic winds',
      'migratory birds, desert gazelles inland, and rich marine life offshore',
      'Based from Dakhla with lagoon and desert day trips',
      'kitesurfing combinations, birding, and desert coastal drives'
    ),
    p(
      'Khenifra National Park',
      'Middle Atlas around Khenifra',
      'a Middle Atlas park of lakes, cedar forest, and highland pastures',
      'Barbary macaques, waterbirds on Atlas lakes, and forest fauna',
      'Reached via Khenifra from Meknes or Midelt corridors',
      'lake visits, cedar forest walks, and highland scenery'
    ),
    p(
      'Tazekka National Park',
      'Middle Atlas near Taza',
      'a compact park of caves, waterfalls, and cedar crowned ridges',
      'Barbary macaques, forest birds, and cave adapted fauna',
      'Day trips from Taza or Fes into Friouato cave country',
      'waterfall walks, cave visits, and ridge hikes'
    ),
  ],
};

export function allParkEntries() {
  /** @type {{ country: string, park: ParkDef }[]} */
  const rows = [];
  for (const [country, parks] of Object.entries(PARKS_BY_COUNTRY)) {
    for (const park of parks) rows.push({ country, park });
  }
  return rows;
}
