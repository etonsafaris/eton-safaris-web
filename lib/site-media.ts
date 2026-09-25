import { OFFICIAL_COMMUNITY_HERO_PATHS } from '@/lib/official-country-assets';

/** Generic section heroes when CMS has no cover — never the brand logo on content cards. */
const GENERIC = OFFICIAL_COMMUNITY_HERO_PATHS[0];

export const SITE_MEDIA = {
  communityHero: OFFICIAL_COMMUNITY_HERO_PATHS[0],
  communityTourism: OFFICIAL_COMMUNITY_HERO_PATHS[1],
  communityEducation: OFFICIAL_COMMUNITY_HERO_PATHS[3],
  communityConservation: OFFICIAL_COMMUNITY_HERO_PATHS[2],
  communityEmployment: OFFICIAL_COMMUNITY_HERO_PATHS[3],
  talkToUsHero: OFFICIAL_COMMUNITY_HERO_PATHS[4],
  safariUpdatesHero: GENERIC,
  gorillasForest: GENERIC,
  wildlifeNationalPark: GENERIC,
  safariVehicle: GENERIC,
  elephantSunset: GENERIC,
  gorillaVideo:
    'https://videos.pexels.com/video-files/31223125/13336255_720_1280_60fps.mp4',
  gorillaVideoFallback:
    'https://videos.pexels.com/video-files/31223124/13336243_720_1280_60fps.mp4',
};
