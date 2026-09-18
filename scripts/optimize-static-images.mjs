/**
 * Generate modern variants for bundled public hero images.
 * Next.js handles request-time optimization for CMS/remote images; these
 * variants prevent large bundled PNG/JPG files from being downloaded as-is.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const heroesDir = path.join(root, 'public', 'heroes');
const sourceExtensions = new Set(['.png', '.jpg', '.jpeg']);
const widths = [480, 640, 768, 1080, 1440];

const gorilla = path.join(root, 'public', 'eton-safaris-gorilla.png');
const gorillaWidths = [96, 192, 384];

async function optimizeLogo() {
  if (!fs.existsSync(gorilla)) return;
  for (const width of gorillaWidths) {
    await sharp(gorilla)
      .resize(width, width, { fit: 'inside' })
      .webp({ quality: 82, effort: 6 })
      .toFile(path.join(root, 'public', `eton-safaris-gorilla-${width}.webp`));
  }
  console.log('Optimized site logo display sizes');
}

async function main() {
  await optimizeLogo();
  if (!fs.existsSync(heroesDir)) return;
  const sources = fs
    .readdirSync(heroesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && sourceExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(heroesDir, entry.name));

  for (const source of sources) {
    const base = path.join(path.dirname(source), path.basename(source, path.extname(source)));
    await sharp(source).webp({ quality: 78, effort: 6 }).toFile(`${base}.webp`);
    await sharp(source).avif({ quality: 55, effort: 6 }).toFile(`${base}.avif`);
    await Promise.all(
      widths.flatMap((width) => [
        sharp(source).resize(width, null, { withoutEnlargement: true }).webp({ quality: 78, effort: 6 }).toFile(`${base}-${width}.webp`),
        sharp(source).resize(width, null, { withoutEnlargement: true }).avif({ quality: 55, effort: 6 }).toFile(`${base}-${width}.avif`),
      ]),
    );
    console.log(`Optimized ${path.relative(root, source)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});