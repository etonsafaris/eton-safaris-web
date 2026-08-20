'use client';

import { useSyncExternalStore } from 'react';
import { clearCollectionCache } from '@/lib/data';
import { supabase } from '@/lib/supabase/client';

const CHANNEL = 'eton-cms-live';
const POLL_MS = 8_000;

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

  const onFocus = () => refreshLocal();
  const onVisible = () => {
    if (document.visibilityState === 'visible') refreshLocal();
  };

  window.addEventListener('focus', onFocus);
  window.addEventListener(CHANNEL, onRemote);
  document.addEventListener('visibilitychange', onVisible);
  const poll = window.setInterval(refreshLocal, POLL_MS);

  const realtime = supabase
    .channel('eton-public-cms')
    .on('postgres_changes', { event: '*', schema: 'public' }, onRemote)
    .subscribe();

  return () => {
    started = false;
    window.removeEventListener('focus', onFocus);
    window.removeEventListener(CHANNEL, onRemote);
    document.removeEventListener('visibilitychange', onVisible);
    window.clearInterval(poll);
    channel?.removeEventListener('message', onRemote);
    channel?.close();
    void supabase.removeChannel(realtime);
  };
}
