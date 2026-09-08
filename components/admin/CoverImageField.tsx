'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { uploadOptimizedImage } from '@/lib/upload-media';
import { isLiveCmsImage } from '@/lib/public-image';

type CoverImageFieldProps = {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  label?: string;
  className?: string;
  previewClassName?: string;
};

export default function CoverImageField({
  value,
  onChange,
  folder,
  label = 'Cover Image',
  className = '',
  previewClassName = 'h-[220px]',
}: CoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setOptimizing(true);
    setError('');
    try {
      const url = await uploadOptimizedImage(file, folder);
      if (typeof window !== 'undefined' && !/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname) && !isLiveCmsImage(url)) {
        throw new Error(
          'This image will not appear on the public website. Upload needs a public Supabase Storage URL. Add SUPABASE_SERVICE_ROLE_KEY in Vercel, then try again.'
        );
      }
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image could not be added. Check storage permissions.');
    } finally {
      setOptimizing(false);
      event.target.value = '';
    }
  }

  return (
    <div className={className}>
      {label ? <label className="mb-2 block text-sm font-medium text-[#374151]">{label}</label> : null}
      <div
        className={`group relative flex ${previewClassName} flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#d1d5db] bg-[#fafafa] transition hover:border-[#00A651] hover:bg-[#f0fdf4]`}
      >
        {value && !value.startsWith('blob:') ? (
          <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#00A651]">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            <p className="mt-3 text-sm font-semibold text-[#111827]">
              {optimizing ? 'Optimizing…' : 'Click to add a cover image'}
            </p>
            <p className="mt-1 text-xs text-[#6b7280]">PNG, JPEG, WebP, or GIF</p>
          </>
        )}
        {optimizing && value ? (
          <div className="absolute inset-0 z-[2] flex items-center justify-center bg-black/40 text-sm font-semibold text-white">
            Optimizing…
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="absolute inset-0 z-[3] cursor-pointer opacity-0"
          onChange={handleFile}
          disabled={optimizing}
          aria-label="Add cover image"
        />
      </div>
      <input
        value={value.startsWith('blob:') ? '' : value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Image URL"
        className="mt-3 w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20"
      />
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
