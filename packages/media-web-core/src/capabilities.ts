import type { MediaCapabilities } from './types';

export function capabilitiesForSource(source: {
  videoVariants?: unknown[];
  subtitleTracks?: unknown[];
  provider?: string;
  url: string;
}): MediaCapabilities {
  const host = (() => {
    try { return new URL(source.url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
  })();
  const direct = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(source.url);
  const youtube = host === 'youtube.com' || host === 'youtu.be';
  const vimeo = host === 'vimeo.com' || host === 'player.vimeo.com';
  return {
    metadata: true,
    image: true,
    html5Video: direct,
    iframe: !direct,
    timestampUrl: direct || youtube || vimeo,
    seek: direct || youtube || vimeo,
    subtitles: Boolean(source.subtitleTracks?.length),
    qualitySelection: Boolean(source.videoVariants && source.videoVariants.length > 1) || vimeo,
    playbackSpeed: direct || vimeo,
    chapters: vimeo,
  };
}
