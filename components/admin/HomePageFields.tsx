'use client';

import { Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { HomeFeaturePoint } from '@/lib/home-page-content';
import { uploadMediaFile } from '@/lib/upload-media';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold text-[#374151]">{children}</label>;
}

export default function HomePageFields({
  brandTitle,
  brandDescription,
  setsApartHeading,
  setsApartIntro,
  features,
  videos,
  footerAbout,
  onBrandTitle,
  onBrandDescription,
  onSetsApartHeading,
  onSetsApartIntro,
  onFeatures,
  onVideos,
  onFooterAbout,
}: {
  brandTitle: string;
  brandDescription: string;
  setsApartHeading: string;
  setsApartIntro: string;
  features: HomeFeaturePoint[];
  videos: string[];
  footerAbout: string;
  onBrandTitle: (value: string) => void;
  onBrandDescription: (value: string) => void;
  onSetsApartHeading: (value: string) => void;
  onSetsApartIntro: (value: string) => void;
  onFeatures: (value: HomeFeaturePoint[]) => void;
  onVideos: (value: string[]) => void;
  onFooterAbout: (value: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');

  function updateFeature(index: number, patch: Partial<HomeFeaturePoint>) {
    onFeatures(features.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function handleVideoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    setUploadStatus('Compressing video for faster loading…');
    try {
      const url = await uploadMediaFile(file, 'home-videos', { onStatus: setUploadStatus });
      onVideos([...videos, url]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Video upload failed.');
    } finally {
      setUploading(false);
      setUploadStatus('');
      event.target.value = '';
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-xl border border-[#e5e7eb] bg-[#f8faf9] p-6">
        <h2 className="font-serif text-2xl font-bold italic text-[#374151]">ETON SAFARIS intro</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          This is the large uppercase heading and paragraph under the home search bar.
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <FieldLabel>Heading (shown in capitals)</FieldLabel>
            <input
              value={brandTitle}
              onChange={(event) => onBrandTitle(event.target.value.toUpperCase())}
              className="w-full rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm uppercase outline-none focus:border-[#66bb9a]"
              placeholder="ETON SAFARIS"
            />
          </div>
          <div>
            <FieldLabel>Description text</FieldLabel>
            <textarea
              value={brandDescription}
              onChange={(event) => onBrandDescription(event.target.value)}
              rows={7}
              className="w-full rounded-2xl border border-[#e5e7eb] bg-white px-5 py-3 text-sm leading-relaxed outline-none focus:border-[#66bb9a]"
              placeholder="Company description shown under ETON SAFARIS"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#e5e7eb] bg-[#f8faf9] p-6">
        <h2 className="font-serif text-2xl font-bold italic text-[#374151]">What Sets Us Apart</h2>
        <p className="mt-1 text-sm text-[#6b7280]">Edit the heading, intro, and the four points beside the video.</p>
        <div className="mt-5 space-y-4">
          <div>
            <FieldLabel>Section heading</FieldLabel>
            <input
              value={setsApartHeading}
              onChange={(event) => onSetsApartHeading(event.target.value)}
              className="w-full rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm outline-none focus:border-[#66bb9a]"
              placeholder="What Sets Us Apart"
            />
          </div>
          <div>
            <FieldLabel>Intro text</FieldLabel>
            <textarea
              value={setsApartIntro}
              onChange={(event) => onSetsApartIntro(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-[#e5e7eb] bg-white px-5 py-3 text-sm leading-relaxed outline-none focus:border-[#66bb9a]"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {features.map((feature, index) => (
              <div key={index} className="rounded-2xl border border-[#e5e7eb] bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Point {index + 1}</p>
                <input
                  value={feature.title}
                  onChange={(event) => updateFeature(index, { title: event.target.value })}
                  className="mb-3 w-full rounded-full border border-[#e5e7eb] px-4 py-2.5 text-sm outline-none focus:border-[#66bb9a]"
                  placeholder="Point title"
                />
                <textarea
                  value={feature.description}
                  onChange={(event) => updateFeature(index, { description: event.target.value })}
                  rows={4}
                  className="w-full rounded-2xl border border-[#e5e7eb] px-4 py-2.5 text-sm outline-none focus:border-[#66bb9a]"
                  placeholder="Point description"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#e5e7eb] bg-[#f8faf9] p-6">
        <h2 className="font-serif text-2xl font-bold italic text-[#374151]">Home video clip</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Upload one or more videos. Each clip is compressed to 720p MP4 before it is saved, so the home page stays fast.
          On the public site a clip plays through, then the next one starts. Arrows skip only when a visitor clicks them.
          Visitors can mute or unmute sound.
        </p>
        <div className="mt-5 space-y-3">
          {videos.map((url, index) => (
            <div key={`${url}-${index}`} className="flex items-center gap-3 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3">
              <video src={url} className="h-16 w-28 rounded-lg object-cover bg-black" muted playsInline preload="metadata" />
              <p className="min-w-0 flex-1 truncate text-xs text-[#6b7280]">{url}</p>
              <button
                type="button"
                onClick={() => onVideos(videos.filter((_, itemIndex) => itemIndex !== index))}
                className="rounded-md p-2 text-red-500 hover:bg-red-50"
                aria-label={`Remove video ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-[#10b981] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#059669] disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {uploading ? uploadStatus || 'Uploading…' : 'Upload video'}
            </button>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
            <input
              type="url"
              placeholder="Or paste a video URL and press Enter"
              className="min-w-[240px] flex-1 rounded-full border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#66bb9a]"
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                const value = (event.target as HTMLInputElement).value.trim();
                if (!value) return;
                onVideos([...videos, value]);
                (event.target as HTMLInputElement).value = '';
              }}
            />
          </div>
          {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
        </div>
      </section>

      <section className="rounded-xl border border-[#e5e7eb] bg-[#f8faf9] p-6">
        <h2 className="font-serif text-2xl font-bold italic text-[#374151]">Footer About Us</h2>
        <p className="mt-1 text-sm text-[#6b7280]">This text appears in the website footer under About Us.</p>
        <textarea
          value={footerAbout}
          onChange={(event) => onFooterAbout(event.target.value)}
          rows={5}
          className="mt-5 w-full rounded-2xl border border-[#e5e7eb] bg-white px-5 py-3 text-sm leading-relaxed outline-none focus:border-[#66bb9a]"
          placeholder="Footer about text"
        />
      </section>
    </div>
  );
}
