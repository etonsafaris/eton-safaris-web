/**
 * Generate + seed keyword packs for CMS categories that were missing coverage
 * (e.g. Seychelles Safaris Tours while Beach Holidays already had keywords).
 *
 * Usage:
 *   node scripts/generate-missing-category-keywords.mjs
 *   node scripts/generate-missing-category-keywords.mjs --seed
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  FIRST_COUNTRY_SCOPES,
  MISSING_CATEGORY_SCOPES,
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
    'CategorySlug',
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
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="All Keywords">
  <Table>
${[`<Row>${cells(header)}</Row>`, ...rows.map((row) => `<Row>${cells(row)}</Row>`)].join('\n')}
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

function allScopes() {
  return [...FIRST_COUNTRY_SCOPES, ...REMAINING_SCOPES, ...MISSING_CATEGORY_SCOPES];
}

function generateMissingFiles() {
  mkdirSync(dataDir, { recursive: true });
  const summary = [];
  for (const scope of MISSING_CATEGORY_SCOPES) {
    const keywords = buildKeywordUniverse(scope);
    const filePath = join(dataDir, scope.keywordFile);
    writeFileSync(filePath, `${keywords.join('\n')}\n`, 'utf8');
    summary.push({
      country: scope.country,
      category: scope.category,
      file: scope.keywordFile,
      count: keywords.length,
    });
    console.log(`Wrote ${keywords.length} keywords → scripts/data/${scope.keywordFile}`);
  }
  return summary;
}

function exportWorkbook() {
  mkdirSync(exportDir, { recursive: true });
  const rows = [];
  const scopeByFile = new Map(allScopes().map((scope) => [scope.keywordFile, scope]));

  for (const scope of allScopes()) {
    for (const keyword of uniquePhrases(readLines(join(dataDir, scope.keywordFile)))) {
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

  for (const file of readdirSync(dataDir)) {
    if (!file.endsWith('.txt') || scopeByFile.has(file)) continue;
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

  const byCountry = {};
  for (const scope of allScopes()) {
    const count = uniquePhrases(readLines(join(dataDir, scope.keywordFile))).length;
    (byCountry[scope.country] ||= []).push({ category: scope.category, count, file: scope.keywordFile });
  }
  writeFileSync(
    summaryPath,
    `\uFEFF${[
      ['Country', 'Category', 'Keyword File', 'Keyword Count'].map(csvEscape).join(','),
      ...Object.entries(byCountry)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .flatMap(([country, list]) =>
          list.map((item) =>
            [country, item.category, item.file, item.count].map(csvEscape).join(',')
          )
        ),
      ['TOTAL workbook rows', '', '', rows.length].map(csvEscape).join(','),
    ].join('\n')}\n`,
    'utf8'
  );

  console.log(`Excel workbook: ${xlsPath}`);
  console.log(`Total workbook rows: ${rows.length}`);
  return { rows: rows.length, xlsPath, csvPath, summaryPath };
}

async function seedMissing() {
  const results = [];
  for (const scope of MISSING_CATEGORY_SCOPES) {
    console.log(`\nSeeding ${scope.country} → ${scope.category} ...`);
    const result = await runKeywordScopeSeed({
      country: scope.country,
      category: scope.category,
      countrySlug: scope.countrySlug,
      countryTagline: scope.countryTagline,
      categorySlug: scope.categorySlug,
      categoryDescription: scope.categoryDescription,
      keywordFile: join(dataDir, scope.keywordFile),
      injectFocusKeywords: true,
      focusKeywordLimit: 500,
      renameFrom: scope.renameFrom,
    });
    results.push(result);
    console.log(
      JSON.stringify(
        {
          country: result.country,
          category: result.category,
          totalForScope: result.totalForScope,
          focusKeywordsInjected: result.focusKeywordsInjected,
          categoryCreated: result.categoryCreated,
        },
        null,
        2
      )
    );
  }
  return results;
}

generateMissingFiles();
exportWorkbook();
if (args.has('--seed')) {
  await seedMissing();
}
