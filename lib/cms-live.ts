'use client';

import { useSyncExternalStore } from 'react';
import { clearCollectionCache } from '@/lib/collection-cache';
import { supabase } from '@/lib/supabase/client';

const CHANNEL = 'eton-cms-live';

let version = 0;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function refreshLocal() {
  clearCollectionCache();
  emit();
}

export function bumpCmsLive() {
  refreshLocal();
  if (typeof window === 'undefined') return;
  try {
    new BroadcastChannel(CHANNEL).postMessage({ at: Date.now() });
  } catch {
    window.dispatchEvent(new Event(CHANNEL));
  }
}

export function subscribeCmsLive(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCmsLiveVersion() {
  return version;
}

export function useCmsLive() {
  return useSyncExternalStore(subscribeCmsLive, getCmsLiveVersion, () => 0);
}

/**
 * Live sync should only invalidate after real CMS changes.
 * Polling / focus used to clear caches every few seconds and force
 * re-downloading ~2900 tours — that looked like "all data failed to load".
 */
export function startCmsLiveSync() {
  if (started || typeof window === 'undefined') return () => undefined;
  started = true;

  const onRemote = () => refreshLocal();

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.addEventListener('message', onRemote);
  } catch {
    channel = null;
  }

  window.addEventListener(CHANNEL, onRemote);
  const realtime = supabase
    .channel('eton-public-cms')
    .on('postgres_changes', { event: '*', schema: 'public' }, onRemote)
    .subscribe();

  return () => {
    started = false;
    window.removeEventListener(CHANNEL, onRemote);
    channel?.removeEventListener('message', onRemote);
    channel?.close();
    void supabase.removeChannel(realtime);
  };
}
