import { SITE_LOGO } from '@/lib/collections';

/** Generic section heroes — logo only. Country/tour/park covers come from CMS in Aiven. */
const GENERIC = SITE_LOGO;

export const SITE_MEDIA = {
  communityHero: '/heroes/community-hero-768.webp',
  communityTourism: '/heroes/community-tourism-1440.webp',
  communityEducation: '/heroes/community-employment-1440.webp',
  communityConservation: '/heroes/community-conservation-1440.webp',
  communityEmployment: '/heroes/community-employment-1440.webp',
  talkToUsHero: '/heroes/talk-to-us-480.webp',
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
