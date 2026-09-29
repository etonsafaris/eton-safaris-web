const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_WIDTH = 1920;
const QUALITY = 0.78;

export function isAllowedImageFile(file: File) {
  if (ALLOWED_TYPES.has(file.type)) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

export async function optimizeImageFile(file: File, maxWidth = MAX_WIDTH): Promise<File> {
  if (!file.type.startsWith('image/') && !isAllowedImageFile(file)) {
    throw new Error('Only PNG, JPEG, WebP, and GIF images are allowed.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (!isAllowedImageFile(file)) {
      throw new Error('This image format is not supported in your browser. Save as JPG or PNG and try again.');
    }
    return file;
  }
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY));
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
  return new File([blob], name, { type: 'image/webp' });
}
