/**
 * Build crawlable favicons for Google Search and browsers.
 *
 * Outputs static files in public/ only — crawlers and browsers fetch these
 * directly (no Next.js metadata route that can 500 in production).
 *
 * Run: npm run icons:generate
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public', 'eton-safaris-gorilla.png');

const publicDir = path.join(root, 'public');
const appDir = path.join(root, 'app');

if (!fs.existsSync(source)) {
  console.error('Missing logo:', source);
  process.exit(1);
}

/** Fit the full logo in a square — keeps the gorilla mark readable in browser tabs. */
async function squareLogo(input, size) {
  return sharp(input)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 });
}

async function writePng(pipeline, dest) {
  await pipeline.clone().toFile(dest);
  const stat = fs.statSync(dest);
  console.log(`  ${path.relative(root, dest)} (${stat.size} bytes)`);
}

async function main() {
  console.log('Generating site icons from', path.relative(root, source));

  const sizes = {
    tab: 192,
    apple: 180,
    google: 48,
  };

  const tabPipeline = await squareLogo(source, sizes.tab);
  const applePipeline = await squareLogo(source, sizes.apple);
  const googlePipeline = await squareLogo(source, sizes.google);

  // Static public files — crawlers fetch these directly
  await writePng(tabPipeline, path.join(publicDir, 'icon.png'));
  await writePng(tabPipeline, path.join(publicDir, 'icon-192.png'));
  await writePng(applePipeline, path.join(publicDir, 'apple-icon.png'));
  await writePng(googlePipeline, path.join(publicDir, 'icon-48.png'));

  const icoBuffers = await Promise.all(
    [16, 32, 48].map((s) => squareLogo(source, s).then((p) => p.png().toBuffer())),
  );
  const ico = await toIco(icoBuffers);
  const faviconPath = path.join(publicDir, 'favicon.ico');
  fs.writeFileSync(faviconPath, ico);
  console.log(`  ${path.relative(root, faviconPath)} (${ico.length} bytes)`);

  // Next.js app icons — Chrome reads these from the document head
  await writePng(tabPipeline, path.join(appDir, 'icon.png'));
  await writePng(applePipeline, path.join(appDir, 'apple-icon.png'));

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
