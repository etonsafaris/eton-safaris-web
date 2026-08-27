'use client';

import { useSyncExternalStore } from 'react';
import { clearCollectionCache } from '@/lib/collection-cache';

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
 * Live sync should only invalidate after a real CMS save in this browser.
 * Do not subscribe to postgres_changes on the public site — every open tab
 * was replicating the whole schema and exhausting Realtime + compute.
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

  return () => {
    started = false;
    window.removeEventListener(CHANNEL, onRemote);
    channel?.removeEventListener('message', onRemote);
    channel?.close();
  };
}
