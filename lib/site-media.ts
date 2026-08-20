const BASE44 = 'https://media.base44.com/images/public/6a5f7c0db1a6420222ceed3b';

function base44Image(id: string, width: number, height: number) {
  return `${BASE44}/${id}_generated_image.png/v1/fill/w_${Math.min(width, 1080)},h_${Math.min(height, 640)},al_c,q_70,usm_0.66_1.00_0.01,enc_webp,quality_auto/${id}_generated_image.webp`;
}

export const SITE_MEDIA = {
  communityHero: base44Image('a7f490092', 1920, 800),
  communityTourism: base44Image('4b53885f1', 1020, 640),
  communityEducation: base44Image('1159416c5', 1020, 640),
  communityConservation: base44Image('c0ca88093', 1020, 640),
  communityEmployment: base44Image('c4601d0c3', 1020, 640),
  gorillasForest: '/heroes/rwanda.jpg',
  wildlifeNationalPark: '/heroes/botswana.jpg',
  safariVehicle: '/heroes/kenya.jpg',
  elephantSunset: '/heroes/zambia.jpg',
  gorillaVideo:
    'https://videos.pexels.com/video-files/31223125/13336255_720_1280_60fps.mp4',
  gorillaVideoFallback:
    'https://videos.pexels.com/video-files/31223124/13336243_720_1280_60fps.mp4',
};
