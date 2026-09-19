import { NAV_COUNTRIES } from '@/lib/collections';
import { destinationPublicPath } from '@/lib/cms-routes';
import { countryHeroImage } from '@/lib/country-heroes';
import { recordMatchesCountrySlug } from '@/lib/country-utils';
import { resolvePublicImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

export type HomeHeroSlide = {
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
};

const HERO_COPY: Record<string, { title: string; subtitle: string }> = {
  uganda: {
    title: 'Crafted Safaris Across the African Wild',
    subtitle:
      "Step into a world of untamed luxury — where every sunrise brings a new encounter with Africa's most extraordinary wildlife and landscapes",
  },
  kenya: {
    title: 'Where the Wild Meets Refined Comfort',
    subtitle:
      "From the Maasai Mara's endless plains to intimate bush dinners under the stars — experience Africa at its most captivating.",
  },
  rwanda: {
    title: 'The Land of a Thousand Hidden Wonders',
    subtitle:
      'Meet the gentle giants of Volcanoes National Park and discover mountain gorillas, friendly people, and stunning rift valley views.',
  },
  tanzania: {
    title: 'Witness the Great Migration',
    subtitle:
      'Witness the great wildebeest migration, climb Kilimanjaro, and discover Serengeti wildlife on unforgettable journeys.',
  },
};

/** Home carousel: admin country photos first, then shipped `/heroes/*` art for that slug. */
export function buildHomeHeroSlides(countries: RecordRow[] = []): HomeHeroSlide[] {
  return NAV_COUNTRIES.map(({ slug, name }) => {
    const dbCountry = countries.find((row) => recordMatchesCountrySlug(row, slug));
    const copy = HERO_COPY[slug] || {
      title: `Discover ${name}`,
      subtitle: `Discover unforgettable safari experiences in ${name}.`,
    };
    const image = countryHeroImage(slug, dbCountry);
    return {
      title: copy.title,
      subtitle: copy.subtitle,
      cta: `Explore ${name}`,
      href: destinationPublicPath(slug),
      image,
    };
  }).filter((slide) => Boolean(resolvePublicImage(slide.image)));
}
