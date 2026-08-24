const MAX_EDGE = 1280;
const TARGET_VIDEO_BPS = 1_600_000;
const TARGET_AUDIO_BPS = 96_000;
const SKIP_IF_MP4_UNDER_BYTES = 2.5 * 1024 * 1024;
const CORE_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';

type VideoProbe = {
  width: number;
  height: number;
  duration: number;
};

type CompressOptions = {
  onStatus?: (status: string) => void;
};

let ffmpegPromise: Promise<import('@ffmpeg/ffmpeg').FFmpeg> | null = null;

function isMp4(file: File) {
  return file.type.includes('mp4') || /\.(mp4|m4v)$/i.test(file.name);
}

function inputExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase() || '';
  if (/^(mp4|m4v|mov|webm|mkv|avi|mpeg|mpg|3gp)$/.test(fromName)) return fromName === 'm4v' ? 'mp4' : fromName;
  if (file.type.includes('webm')) return 'webm';
  if (file.type.includes('quicktime')) return 'mov';
  return 'mp4';
}

async function probeVideo(file: File): Promise<VideoProbe | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Timed out reading video')), 12000);
      video.onloadedmetadata = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('Could not read video'));
      };
    });
    return {
      width: video.videoWidth || 0,
      height: video.videoHeight || 0,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function alreadyWebReady(file: File, probe: VideoProbe | null) {
  if (!isMp4(file)) return false;
  if (file.size <= SKIP_IF_MP4_UNDER_BYTES) return true;
  if (!probe || probe.width < 2 || probe.height < 2 || probe.duration < 0.4) return false;
  const bitrate = (file.size * 8) / probe.duration;
  return Math.max(probe.width, probe.height) <= MAX_EDGE && bitrate <= TARGET_VIDEO_BPS + TARGET_AUDIO_BPS;
}

async function loadFfmpeg(onStatus?: (status: string) => void) {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      onStatus?.('Loading video compressor…');
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import('@ffmpeg/ffmpeg'), import('@ffmpeg/util')]);
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return ffmpeg;
    })();
  }
  try {
    return await ffmpegPromise;
  } catch (error) {
    ffmpegPromise = null;
    throw error;
  }
}

function outputName(file: File) {
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').slice(0, 60) || 'clip';
  return `${base}.mp4`;
}

export async function optimizeVideoFile(file: File, options: CompressOptions = {}): Promise<File> {
  if (typeof window === 'undefined') return file;

  const { onStatus } = options;
  onStatus?.('Checking video…');
  const probe = await probeVideo(file);
  if (alreadyWebReady(file, probe)) {
    onStatus?.('Video is already web-ready.');
    return file;
  }

  const ffmpeg = await loadFfmpeg(onStatus);
  const { fetchFile } = await import('@ffmpeg/util');
  const inputName = `input.${inputExtension(file)}`;
  const outName = 'output.mp4';

  const onProgress = ({ progress }: { progress: number }) => {
    const pct = Math.max(0, Math.min(99, Math.round((progress || 0) * 100)));
    onStatus?.(`Compressing video… ${pct}%`);
  };
  ffmpeg.on('progress', onProgress);

  try {
    onStatus?.('Preparing video…');
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    onStatus?.('Compressing video…');
    const portrait = Boolean(probe && probe.height > probe.width);
    const scale = portrait ? `scale=-2:'min(${MAX_EDGE},ih)'` : `scale='min(${MAX_EDGE},iw)':-2`;
    const args = [
      '-i',
      inputName,
      '-vf',
      `${scale},format=yuv420p`,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '28',
      '-maxrate',
      '1600k',
      '-bufsize',
      '3200k',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-ac',
      '2',
      '-ar',
      '44100',
      outName,
    ];
    let code = await ffmpeg.exec(args);
    if (code !== 0) {
      code = await ffmpeg.exec([
        '-i',
        inputName,
        '-vf',
        `${scale},format=yuv420p`,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '28',
        '-an',
        '-movflags',
        '+faststart',
        outName,
      ]);
    }
    if (code !== 0) throw new Error('Video compression failed.');

    const data = await ffmpeg.readFile(outName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const blob = new Blob([buffer], { type: 'video/mp4' });
    const compressed = new File([blob], outputName(file), { type: 'video/mp4' });
    if (compressed.size < 1024) throw new Error('Compressed video was empty.');
    if (isMp4(file) && compressed.size >= file.size * 0.95) {
      onStatus?.('Keeping original video (already small).');
      return file;
    }
    onStatus?.('Video compressed. Uploading…');
    return compressed;
  } finally {
    ffmpeg.off('progress', onProgress);
    await Promise.allSettled([ffmpeg.deleteFile(inputName), ffmpeg.deleteFile(outName)]);
  }
}
