'use client';

import type { HomeHeroSlide } from '@/lib/home-hero-slides';
import type { HomePageContent } from '@/lib/home-page-content';
import type { RecordRow } from '@/lib/types';

const STORE_KEY = 'eton-home-view-v1';

export type HomeViewSnapshot = {
  heroSlides: HomeHeroSlide[];
  countries: RecordRow[];
  tours: RecordRow[];
  updates: RecordRow[];
  categories: RecordRow[];
  homeContent?: HomePageContent | null;
};

let memory: HomeViewSnapshot | null = null;

function usable(snapshot: HomeViewSnapshot | null | undefined): snapshot is HomeViewSnapshot {
  return Boolean(snapshot && Array.isArray(snapshot.tours) && snapshot.tours.length > 0);
}

export function readHomeViewSnapshot(): HomeViewSnapshot | null {
  if (usable(memory)) return memory;
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORE_KEY) || '') as HomeViewSnapshot;
    if (usable(parsed)) {
      memory = parsed;
      return parsed;
    }
  } catch {
    /* private mode / bad JSON */
  }
  return null;
}

export function writeHomeViewSnapshot(snapshot: HomeViewSnapshot) {
  if (!usable(snapshot)) return;
  memory = {
    heroSlides: snapshot.heroSlides ?? [],
    countries: snapshot.countries ?? [],
    tours: snapshot.tours ?? [],
    updates: snapshot.updates ?? [],
    categories: snapshot.categories ?? [],
    homeContent: snapshot.homeContent ?? null,
  };
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(memory));
  } catch {
    /* quota / private mode */
  }
}
