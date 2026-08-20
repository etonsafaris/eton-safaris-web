const AMOUNT = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?`;
const CODE = String.raw`(?:USD|UGX|KES|EUR|GBP|TZS|EURO?)`;
const PER_PERSON = String.raw`(?:\s*(?:pp|p\.p\.|per\s*person))?`;

/** Strip currency amounts from guest-facing copy. Admin and checkout are unchanged. */
export function stripPublicMoney(value: string): string {
  if (!value) return value;
  let text = value;
  text = text.replace(new RegExp(String.raw`(?:from\s+)?(?:US\s*)?\$\s*${AMOUNT}${PER_PERSON}(?:\s*\(\s*${CODE}\s*\))?`, 'gi'), '');
  text = text.replace(new RegExp(String.raw`(?:from\s+)?${CODE}\s*${AMOUNT}${PER_PERSON}`, 'gi'), '');
  text = text.replace(new RegExp(String.raw`(?:from\s+)?${AMOUNT}\s*${CODE}${PER_PERSON}`, 'gi'), '');
  text = text.replace(new RegExp(String.raw`[€£]\s*${AMOUNT}${PER_PERSON}`, 'gi'), '');
  text = text.replace(/\s*(?:from\s+)?pp\s*\(\s*USD\s*\)/gi, '');
  text = text.replace(/\(\s*\)/g, '');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/\s+([,.;:])/g, '$1');
  return text.trim();
}
