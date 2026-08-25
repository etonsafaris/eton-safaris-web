/**
 * Generate keyword .txt files for remaining destination countries/categories,
 * then optionally seed Supabase + export Excel.
 *
 * Usage:
 *   node scripts/generate-remaining-country-keywords.mjs
 *   node scripts/generate-remaining-country-keywords.mjs --seed
 *   node scripts/generate-remaining-country-keywords.mjs --export-only
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { REMAINING_SCOPES, buildKeywordUniverse, uniquePhrases } from './lib/keyword-universe.mjs';
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
    'Source',
    'Competition Signal',
    'Traffic Intent',
  ];
  const cells = (values, rowIndex) =>
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

  const xmlRows = [
    `<Row>${cells(header, 0)}</Row>`,
    ...rows.map((row, index) => `<Row>${cells(row, index + 1)}</Row>`),
  ].join('\n');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1"/></Style>
 </Styles>
 <Worksheet ss:Name="All Keywords">
  <Table>
${xmlRows}
  </Table>
 </Worksheet>
</Workbook>
`;
  writeFileSync(filePath, xml, 'utf8');
}

function readExistingKeywordFiles() {
  if (!existsSync(dataDir)) return [];
  const rows = [];
  for (const file of readdirSync(dataDir)) {
    if (!file.endsWith('.txt')) continue;
    const base = file.replace(/\.txt$/i, '');
    const lines = readFileSync(join(dataDir, file), 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    // Infer country/category from filename conventions used in the repo.
    const guess = base
      .replace(/-keywords$/i, '')
      .replace(/-extras$/i, '')
      .replace(/-/g, ' ');
    for (const keyword of lines) {
      rows.push({
        country: '',
        category: guess,
        countrySlug: '',
        categorySlug: base.replace(/-keywords$/i, '').replace(/-extras$/i, ''),
        keyword,
        opportunity: 'Existing seeded list',
        source: file,
        competition: 'Long-tail / mixed',
        intent: 'Traveler commercial',
      });
    }
  }
  return rows;
}

function generateRemainingFiles() {
  mkdirSync(dataDir, { recursive: true });
  const summary = [];
  for (const scope of REMAINING_SCOPES) {
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

function exportWorkbook(generatedSummary) {
  mkdirSync(exportDir, { recursive: true });
  const rows = [];

  for (const scope of REMAINING_SCOPES) {
    const filePath = join(dataDir, scope.keywordFile);
    if (!existsSync(filePath)) continue;
    const keywords = uniquePhrases(
      readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    );
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

  // Include previously seeded destination lists so the workbook is complete.
  for (const item of readExistingKeywordFiles()) {
    const already =
      REMAINING_SCOPES.some((scope) => scope.keywordFile === item.source) ||
      rows.some(
        (row) =>
          String(row[4]).toLowerCase() === item.keyword.toLowerCase() &&
          String(row[3]).toLowerCase() === item.categorySlug.toLowerCase()
      );
    if (already) continue;
    rows.push([
      item.country || '(from filename)',
      item.category,
      item.countrySlug,
      item.categorySlug,
      item.keyword,
      item.opportunity,
      item.source,
      item.competition,
      item.intent,
    ]);
  }

  const csvPath = join(exportDir, 'eton-safaris-keywords-master.csv');
  const xlsPath = join(exportDir, 'eton-safaris-keywords-master.xls');
  const summaryPath = join(exportDir, 'eton-safaris-keywords-summary.csv');

  const csv = [
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
  ].join('\n');
  writeFileSync(csvPath, `\uFEFF${csv}\n`, 'utf8');
  writeExcelXml(rows, xlsPath);

  const summaryCsv = [
    ['Country', 'Category', 'Keyword File', 'Keyword Count'].map(csvEscape).join(','),
    ...generatedSummary.map((item) =>
      [item.country, item.category, item.file, item.count].map(csvEscape).join(',')
    ),
    ['TOTAL (remaining scopes)', '', '', generatedSummary.reduce((sum, item) => sum + item.count, 0)]
      .map(csvEscape)
      .join(','),
    ['TOTAL (workbook rows)', '', '', rows.length].map(csvEscape).join(','),
  ].join('\n');
  writeFileSync(summaryPath, `\uFEFF${summaryCsv}\n`, 'utf8');

  console.log(`Excel workbook: ${xlsPath}`);
  console.log(`CSV workbook:   ${csvPath}`);
  console.log(`Summary:        ${summaryPath}`);
  console.log(`Total keyword rows in workbook: ${rows.length}`);
  return { rows: rows.length, csvPath, xlsPath, summaryPath };
}

async function seedAll() {
  const results = [];
  for (const scope of REMAINING_SCOPES) {
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
      focusKeywordLimit: 400,
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

const exportOnly = args.has('--export-only');
const shouldSeed = args.has('--seed');

const summary = exportOnly ? REMAINING_SCOPES.map((scope) => {
  const filePath = join(dataDir, scope.keywordFile);
  const count = existsSync(filePath)
    ? uniquePhrases(readFileSync(filePath, 'utf8').split(/\r?\n/).filter((line) => line.trim())).length
    : 0;
  return { country: scope.country, category: scope.category, file: scope.keywordFile, count };
}) : generateRemainingFiles();

exportWorkbook(summary);

if (shouldSeed) {
  await seedAll();
}
