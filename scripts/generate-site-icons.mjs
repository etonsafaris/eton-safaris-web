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

if (!fs.existsSync(source)) {
  console.error('Missing logo:', source);
  process.exit(1);
}

/** Square crop for wide logos; pass-through when already square. */
async function squareLogo(input, size) {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;

  let pipeline = sharp(input);
  if (Math.abs(w - h) > 2) {
    const side = Math.min(w, h);
    const left = Math.min(Math.round(w * 0.02), Math.max(0, w - side));
    const top = Math.max(0, Math.round((h - side) / 2));
    pipeline = pipeline.extract({ left, top, width: side, height: side });
  }

  return pipeline
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9, palette: true });
}

async function writePng(pipeline, dest) {
  await pipeline.clone().toFile(dest);
  const stat = fs.statSync(dest);
  console.log(`  ${path.relative(root, dest)} (${stat.size} bytes)`);
}

async function main() {
  console.log('Generating site icons from', path.relative(root, source));

  const sizes = {
    favicon: 48,
    apple: 180,
    pwa: 192,
  };

  const faviconPipeline = await squareLogo(source, sizes.favicon);
  const applePipeline = await squareLogo(source, sizes.apple);
  const pwaPipeline = await squareLogo(source, sizes.pwa);

  // Static public files — Google crawls these directly
  await writePng(faviconPipeline, path.join(publicDir, 'icon.png'));
  await writePng(applePipeline, path.join(publicDir, 'apple-icon.png'));
  await writePng(pwaPipeline, path.join(publicDir, 'icon-192.png'));

  const icoBuffers = await Promise.all(
    [16, 32, 48].map((s) => squareLogo(source, s).then((p) => p.png().toBuffer())),
  );
  const ico = await toIco(icoBuffers);
  const faviconPath = path.join(publicDir, 'favicon.ico');
  fs.writeFileSync(faviconPath, ico);
  console.log(`  ${path.relative(root, faviconPath)} (${ico.length} bytes)`);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
