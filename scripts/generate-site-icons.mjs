/**
 * The only site mark is public/eton-safaris-gorilla.png.
 * Extra Next/browser icon files (icon.png, apple-icon, favicon.ico, icon-192)
 * are deleted here so they cannot be regenerated.
 *
 * Run: npm run icons:generate
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const gorilla = path.join(root, 'public', 'eton-safaris-gorilla.png');

const extraIcons = [
  path.join(root, 'app', 'icon.png'),
  path.join(root, 'app', 'apple-icon.png'),
  path.join(root, 'app', 'favicon.ico'),
  path.join(root, 'public', 'favicon.ico'),
  path.join(root, 'public', 'icon.png'),
  path.join(root, 'public', 'apple-icon.png'),
  path.join(root, 'public', 'icon-192.png'),
];

if (!fs.existsSync(gorilla)) {
  console.error('Missing official logo:', gorilla);
  process.exit(1);
}

console.log('Keeping only', path.relative(root, gorilla));
for (const file of extraIcons) {
  if (!fs.existsSync(file)) continue;
  fs.unlinkSync(file);
  console.log('  removed', path.relative(root, file));
}
console.log('Done. Do not add favicon.ico / icon.png redirects — they crash refresh.');
