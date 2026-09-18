'use client';

import { useRef } from 'react';

/** True when the server already rendered this detail page with a record — never 404 on a failed client refresh. */
export function useServerRecordGate(initialRecord: unknown) {
  const gate = useRef(Boolean(initialRecord));
  return gate;
}
