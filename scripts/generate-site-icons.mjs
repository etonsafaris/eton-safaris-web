/**
 * Build square favicon assets from the official Eton Safaris logo.
 * Outputs app/icon.png, app/apple-icon.png, and public copies for /icon.png URLs.
 */
import sharp from 'sharp';
import { resolve } from 'path';

const root = resolve(process.cwd());
const source = resolve(root, 'public/eton-safaris-gorilla.png');
const white = { r: 255, g: 255, b: 255, alpha: 1 };

async function writeSquare(outPath, size) {
  await sharp(source)
    .resize(size, size, { fit: 'contain', background: white })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function main() {
  await writeSquare(resolve(root, 'app/icon.png'), 512);
  await writeSquare(resolve(root, 'app/apple-icon.png'), 180);
  await writeSquare(resolve(root, 'public/icon.png'), 512);
  await writeSquare(resolve(root, 'public/apple-icon.png'), 180);
  console.log('Generated app/icon.png, app/apple-icon.png, public/icon.png, public/apple-icon.png');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
