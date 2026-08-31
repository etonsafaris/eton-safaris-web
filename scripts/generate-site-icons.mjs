/**
 * Build crawlable favicons for Google Search and browsers.
 *
 * Outputs static files in public/ (primary — always 200 OK for crawlers)
 * plus app/ metadata icons (small sizes to avoid serverless 500s).
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

/** Crop to square around the gorilla mark (left portion of the wide logo). */
async function squareLogo(input, size) {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  const side = Math.min(w, h);
  const left = Math.round(w * 0.02);
  const top = Math.round((h - side) / 2);

  return sharp(input)
    .extract({ left, top, width: side, height: side })
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
    app: 48,
  };

  const faviconPipeline = await squareLogo(source, sizes.favicon);
  const applePipeline = await squareLogo(source, sizes.apple);
  const pwaPipeline = await squareLogo(source, sizes.pwa);
  const appPipeline = await squareLogo(source, sizes.app);

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

  // Next.js metadata icons (keep small)
  await writePng(appPipeline, path.join(appDir, 'icon.png'));
  await writePng(applePipeline, path.join(appDir, 'apple-icon.png'));

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
