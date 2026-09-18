import { NextResponse } from 'next/server';

/** Standard public API failure shape — never throw past the route handler. */
export function publicApiFailure(
  message = 'Request failed',
  status = 503,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json({ data: [], error: true, message, ...extra }, { status });
}

export function publicApiJsonFailure(
  body: Record<string, unknown>,
  status = 503
) {
  return NextResponse.json({ data: [], error: true, ...body }, { status });
}
