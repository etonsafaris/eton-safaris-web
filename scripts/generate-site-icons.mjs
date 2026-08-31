/**
 * Build square favicon assets from the official Eton Safaris logo.
 * Outputs app/icon.png and app/apple-icon.png for Next.js file-based metadata.
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
  console.log('Generated app/icon.png (512) and app/apple-icon.png (180) from public/eton-safaris-gorilla.png');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
