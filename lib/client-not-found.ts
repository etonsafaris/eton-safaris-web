'use client';

import { notFound } from 'next/navigation';

/** Use when a client-only fetch proves the record is missing (server already called notFound when appropriate). */
export function triggerNotFound() {
  notFound();
}
