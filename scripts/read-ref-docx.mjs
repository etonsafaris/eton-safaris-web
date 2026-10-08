import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ref =
  'C:/Users/User/OneDrive/Desktop/Dav Safari/WESITE CONTENT/Uganda/Uganda Site Content/BEST 5 FOREST EXPERIENCES ON UGANDA TOUR SAFARIS.docx';
const cache = resolve(dirname(fileURLToPath(import.meta.url)), '.cache', 'ref-docx');
rmSync(cache, { recursive: true, force: true });
mkdirSync(cache, { recursive: true });
const zipCopy = join(cache, 'ref.zip');
writeFileSync(zipCopy, readFileSync(ref));
execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipCopy.replace(/'/g, "''")}' -DestinationPath '${cache.replace(/'/g, "''")}' -Force"`);
const xml = readFileSync(join(cache, 'word', 'document.xml'), 'utf8');
const text = xml
  .replace(/<w:tab[^>]*\/>/g, '\t')
  .replace(/<w:br[^>]*\/>/g, '\n')
  .replace(/<\/w:p>/g, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
console.log(text);
