/**
 * Build favicons from the official gorilla logo (public/eton-safaris-gorilla.png).
 *
 * - app/icon.png + app/apple-icon.png — Next.js tab icon (512 / 180)
 * - public/favicon.ico — browsers and Google that request /favicon.ico
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
const white = { r: 255, g: 255, b: 255, alpha: 1 };

if (!fs.existsSync(source)) {
  console.error('Missing logo:', source);
  process.exit(1);
}

async function writeLogo(outPath, size) {
  await sharp(source)
    .resize(size, size, { fit: 'contain', background: white })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  const stat = fs.statSync(outPath);
  console.log(`  ${path.relative(root, outPath)} (${stat.size} bytes, ${size}x${size})`);
}

async function main() {
  console.log('Generating site icons from', path.relative(root, source));

  await writeLogo(path.join(appDir, 'icon.png'), 512);
  await writeLogo(path.join(appDir, 'apple-icon.png'), 180);

  const icoBuffers = await Promise.all(
    [16, 32, 48].map((size) =>
      sharp(source)
        .resize(size, size, { fit: 'contain', background: white })
        .png()
        .toBuffer(),
    ),
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
