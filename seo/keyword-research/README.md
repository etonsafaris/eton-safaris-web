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

## Note on Keysearch

Exact Keysearch volume/KD scores require a Keysearch account API. These lists are built from destination/experience long-tails (parks, trip styles, durations, commercial intent) chosen for **lower competition than East Africa head terms** and strong safari planning traffic patterns from 2025 market reports.
