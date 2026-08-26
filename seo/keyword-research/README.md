# Keyword research exports

Generated traveler-intent keyword lists for Eton Safaris destinations.

## Files

| File | Purpose |
|---|---|
| `eton-safaris-keywords-master.xls` | Excel workbook (open in Excel / Google Sheets) |
| `eton-safaris-keywords-master.csv` | Same data as CSV (UTF-8 BOM for Excel) |
| `eton-safaris-keywords-summary.csv` | Counts by country/category |

## Regenerate

```bash
npm run keywords:generate-remaining
npm run keywords:export
```

## Seed into CMS + public SEO

Requires `.env.local` with Supabase credentials:

```bash
npm run seed:remaining-country-keywords
```

This writes the full lists into the `keywords` admin library and injects up to 400 focus keywords onto each category (plus a country-level set) so public pages emit `<meta name="keywords">`.

## Coverage rule

Every live CMS category under each country should have a keyword pack. Audit with:

```bash
npm run keywords:audit-categories
```

Fill gaps with:

```bash
npm run seed:missing-category-keywords
```
