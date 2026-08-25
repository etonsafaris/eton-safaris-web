/**
 * Expand keyword lists for the FIRST / original destination countries & categories
 * with many more low-competition long-tail phrases, merge into existing .txt files,
 * refresh the Excel workbook, and optionally seed + inject public SEO.
 *
 * Usage:
 *   node scripts/generate-first-country-keywords.mjs
 *   node scripts/generate-first-country-keywords.mjs --seed
 *   node scripts/generate-first-country-keywords.mjs --export-only
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  FIRST_COUNTRY_SCOPES,
  REMAINING_SCOPES,
  buildKeywordUniverse,
  uniquePhrases,
} from './lib/keyword-universe.mjs';
import { runKeywordScopeSeed } from './lib/keyword-scope-seed.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, 'data');
const exportDir = resolve(process.cwd(), 'seo', 'keyword-research');
const args = new Set(process.argv.slice(2));

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeExcelXml(rows, filePath) {
  const header = [
    'Country',
    'Category',
    'Country Slug',
    'Category Slug',
    'Keyword',
    'Opportunity Notes',
    'Source File',
    'Competition Signal',
    'Traffic Intent',
  ];
  const cells = (values) =>
    values
      .map((value, colIndex) => {
        const isNumber = typeof value === 'number';
        return `<Cell ss:Index="${colIndex + 1}"><Data ss:Type="${isNumber ? 'Number' : 'String'}">${String(
          value ?? ''
        )
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</Data></Cell>`;
      })
      .join('');

  const xmlRows = [`<Row>${cells(header)}</Row>`, ...rows.map((row) => `<Row>${cells(row)}</Row>`)].join(
    '\n'
  );

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="All Keywords">
  <Table>
${xmlRows}
  </Table>
 </Worksheet>
</Workbook>
`;
  writeFileSync(filePath, xml, 'utf8');
}

function readLines(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function expandFirstCountryFiles() {
  mkdirSync(dataDir, { recursive: true });
  const summary = [];
  for (const scope of FIRST_COUNTRY_SCOPES) {
    const filePath = join(dataDir, scope.keywordFile);
    const existing = readLines(filePath);
    const generated = buildKeywordUniverse(scope);
    const merged = uniquePhrases([...existing, ...generated]);
    writeFileSync(filePath, `${merged.join('\n')}\n`, 'utf8');
    summary.push({
      country: scope.country,
      category: scope.category,
      file: scope.keywordFile,
      before: existing.length,
      after: merged.length,
      added: merged.length - existing.length,
    });
    console.log(
      `${scope.country} / ${scope.category}: ${existing.length} → ${merged.length} (+${merged.length - existing.length})`
    );
  }
  return summary;
}

function allKnownScopes() {
  return [...FIRST_COUNTRY_SCOPES, ...REMAINING_SCOPES];
}

function exportWorkbook(firstSummary) {
  mkdirSync(exportDir, { recursive: true });
  const rows = [];
  const scopeByFile = new Map(allKnownScopes().map((scope) => [scope.keywordFile, scope]));

  for (const scope of allKnownScopes()) {
    const keywords = uniquePhrases(readLines(join(dataDir, scope.keywordFile)));
    for (const keyword of keywords) {
      rows.push([
        scope.country,
        scope.category,
        scope.countrySlug,
        scope.categorySlug,
        keyword,
        scope.opportunity,
        scope.keywordFile,
        'Lower competition long-tail (destination/experience specific)',
        'High commercial / planning intent',
      ]);
    }
  }

  // Any leftover extras/txt not mapped to a scope still appear in the workbook.
  for (const file of readdirSync(dataDir)) {
    if (!file.endsWith('.txt')) continue;
    if (scopeByFile.has(file)) continue;
    for (const keyword of uniquePhrases(readLines(join(dataDir, file)))) {
      rows.push([
        '(from filename)',
        file.replace(/\.txt$/i, '').replace(/-/g, ' '),
        '',
        file.replace(/\.txt$/i, ''),
        keyword,
        'Legacy / extras list',
        file,
        'Long-tail / mixed',
        'Traveler commercial',
      ]);
    }
  }

  const csvPath = join(exportDir, 'eton-safaris-keywords-master.csv');
  const xlsPath = join(exportDir, 'eton-safaris-keywords-master.xls');
  const summaryPath = join(exportDir, 'eton-safaris-keywords-summary.csv');

  writeFileSync(
    csvPath,
    `\uFEFF${[
      [
        'Country',
        'Category',
        'Country Slug',
        'Category Slug',
        'Keyword',
        'Opportunity Notes',
        'Source File',
        'Competition Signal',
        'Traffic Intent',
      ]
        .map(csvEscape)
        .join(','),
      ...rows.map((row) => row.map(csvEscape).join(',')),
    ].join('\n')}\n`,
    'utf8'
  );
  writeExcelXml(rows, xlsPath);

  const firstTotalAfter = firstSummary.reduce((sum, item) => sum + item.after, 0);
  const firstTotalAdded = firstSummary.reduce((sum, item) => sum + item.added, 0);
  writeFileSync(
    summaryPath,
    `\uFEFF${[
      ['Group', 'Country', 'Category', 'Keyword File', 'Before', 'After', 'Added'].map(csvEscape).join(','),
      ...firstSummary.map((item) =>
        ['First countries', item.country, item.category, item.file, item.before, item.after, item.added]
          .map(csvEscape)
          .join(',')
      ),
      ['First countries TOTAL', '', '', '', '', firstTotalAfter, firstTotalAdded].map(csvEscape).join(','),
      ['Workbook TOTAL rows', '', '', '', '', rows.length, ''].map(csvEscape).join(','),
    ].join('\n')}\n`,
    'utf8'
  );

  console.log(`Excel workbook: ${xlsPath}`);
  console.log(`CSV workbook:   ${csvPath}`);
  console.log(`Summary:        ${summaryPath}`);
  console.log(`Total workbook rows: ${rows.length}`);
  return { rows: rows.length, csvPath, xlsPath, summaryPath };
}

async function seedFirstCountries() {
  const results = [];
  for (const scope of FIRST_COUNTRY_SCOPES) {
    console.log(`\nSeeding ${scope.country} → ${scope.category} ...`);
    const extrasCandidates = [
      scope.keywordFile.replace(/-keywords\.txt$/i, '-extras.txt'),
      scope.keywordFile.replace(/\.txt$/i, '-extras.txt'),
    ];
    const extrasFile = extrasCandidates.map((name) => join(dataDir, name)).find((path) => existsSync(path));

    const result = await runKeywordScopeSeed({
      country: scope.country,
      category: scope.category,
      countrySlug: scope.countrySlug,
      countryTagline: scope.countryTagline,
      categorySlug: scope.categorySlug,
      categoryDescription: scope.categoryDescription,
      keywordFile: join(dataDir, scope.keywordFile),
      extrasFile,
      injectFocusKeywords: true,
      focusKeywordLimit: 500,
    });
    results.push(result);
    console.log(
      JSON.stringify(
        {
          country: result.country,
          category: result.category,
          totalForScope: result.totalForScope,
          added: result.added,
          focusKeywordsInjected: result.focusKeywordsInjected,
        },
        null,
        2
      )
    );
  }
  return results;
}

const exportOnly = args.has('--export-only');
const shouldSeed = args.has('--seed');

const summary = exportOnly
  ? FIRST_COUNTRY_SCOPES.map((scope) => {
      const count = uniquePhrases(readLines(join(dataDir, scope.keywordFile))).length;
      return {
        country: scope.country,
        category: scope.category,
        file: scope.keywordFile,
        before: count,
        after: count,
        added: 0,
      };
    })
  : expandFirstCountryFiles();

exportWorkbook(summary);

if (shouldSeed) {
  await seedFirstCountries();
}
