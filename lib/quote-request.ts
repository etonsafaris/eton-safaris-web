export function quoteRequestPath(options?: {
  country?: string;
  tour?: string;
  destination?: string;
}): string {
  const params = new URLSearchParams();
  const country = options?.country?.trim();
  const tour = options?.tour?.trim();
  const destination = options?.destination?.trim() || country;
  if (country) params.set('country', country);
  if (destination && destination !== country) params.set('destination', destination);
  if (tour) params.set('tour', tour);
  const query = params.toString();
  return query ? `/request-a-quote?${query}` : '/request-a-quote';
}
