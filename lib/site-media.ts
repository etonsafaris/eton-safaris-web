import { countryHeroRemoteFallback } from '@/lib/country-hero-fallback';

/** Generic section heroes when CMS has no cover — never the brand logo on content cards. */
const GENERIC = countryHeroRemoteFallback('uganda');

export const SITE_MEDIA = {
  communityHero: GENERIC,
  communityTourism: countryHeroRemoteFallback('kenya'),
  communityEducation: countryHeroRemoteFallback('rwanda'),
  communityConservation: countryHeroRemoteFallback('tanzania'),
  communityEmployment: countryHeroRemoteFallback('kenya'),
  talkToUsHero: countryHeroRemoteFallback('uganda'),
  safariUpdatesHero: GENERIC,
  gorillasForest: countryHeroRemoteFallback('uganda'),
  wildlifeNationalPark: countryHeroRemoteFallback('kenya'),
  safariVehicle: countryHeroRemoteFallback('tanzania'),
  elephantSunset: countryHeroRemoteFallback('botswana'),
  gorillaVideo:
    'https://videos.pexels.com/video-files/31223125/13336255_720_1280_60fps.mp4',
  gorillaVideoFallback:
    'https://videos.pexels.com/video-files/31223124/13336243_720_1280_60fps.mp4',
};
