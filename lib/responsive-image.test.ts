import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMediaQuality, parseMediaWidth, wantsMediaTransform } from './media-image.ts';
import {
  CARD_IMAGE_WIDTHS,
  canBuildSrcSet,
  cardImageSrc,
  contentImageSrc,
  heroImageSrc,
  imageSrcSet,
  sizedImageUrl,
  thumbImageSrc,
} from './responsive-image.ts';

test('sizedImageUrl resizes CMS media paths like NextGen sized WebP', () => {
  assert.equal(sizedImageUrl('/api/media/abc123', 640, 68), '/api/media/abc123?w=640&q=68&fm=webp');
  assert.equal(sizedImageUrl('/cms-media/abc123', 320, 65), '/cms-media/abc123?w=320&q=65&fm=webp');
  assert.match(
    sizedImageUrl('https://etonsafaris.com/api/media/abc123', 1080, 72),
    /\/api\/media\/abc123\?w=1080&q=72&fm=webp$/
  );
});

test('sizedImageUrl keeps Cloudinary, Unsplash, and hero variants', () => {
  assert.equal(sizedImageUrl('/heroes/kenya.jpg', 1080), '/heroes/kenya-1080.webp');
  assert.match(sizedImageUrl('https://images.unsplash.com/photo.jpg', 640, 68), /[?&]w=640/);
  assert.match(
    sizedImageUrl('https://res.cloudinary.com/demo/image/upload/v1/lion.jpg', 640),
    /\/upload\/f_auto,q_auto:eco,c_fill,w_640\//
  );
});

test('srcset helpers cover cards, thumbs, and heroes', () => {
  assert.equal(canBuildSrcSet('/api/media/abc'), true);
  assert.equal(canBuildSrcSet('/random.png'), false);
  assert.equal(cardImageSrc('/api/media/abc'), '/api/media/abc?w=640&q=68&fm=webp');
  assert.equal(thumbImageSrc('/api/media/abc'), '/api/media/abc?w=160&q=65&fm=webp');
  assert.equal(heroImageSrc('/api/media/abc'), '/api/media/abc?w=1080&q=72&fm=webp');
  assert.equal(contentImageSrc('/api/media/abc'), '/api/media/abc?w=1080&q=72&fm=webp');
  assert.match(imageSrcSet('/api/media/abc', CARD_IMAGE_WIDTHS), /640w/);
});

test('media transform query parsing clamps width and quality', () => {
  assert.equal(parseMediaWidth('640'), 640);
  assert.equal(parseMediaWidth('99999'), 1440);
  assert.equal(parseMediaWidth('nope'), null);
  assert.equal(parseMediaQuality('90'), 82);
  assert.equal(parseMediaQuality('10'), 40);
  assert.equal(wantsMediaTransform(new URLSearchParams('w=640')), true);
  assert.equal(wantsMediaTransform(new URLSearchParams('fm=webp')), true);
  assert.equal(wantsMediaTransform(new URLSearchParams()), false);
});
