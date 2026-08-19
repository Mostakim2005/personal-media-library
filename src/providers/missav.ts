import type { MetadataProvider, ProviderContext } from './types';
import type { MetadataResult, MediaPerson, SubtitleTrack, VideoVariant } from '../types';
import { meta, text, all, absoluteUrl, uniqueStrings } from './helpers';

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

export class MissAVProvider implements MetadataProvider {
  id = 'missav';
  displayName = 'MissAV';

  matches(url: string): boolean {
    const h = host(url);
    return h.endsWith('missav.ws') || h.endsWith('missav.com') || h.endsWith('missav.ai') || h.endsWith('missav.live');
  }

  extract({ url, document }: ProviderContext): MetadataResult | undefined {
    const title = meta(document, ['meta[property="og:title"]', 'meta[name="twitter:title"]', 'title']);
    if (!title) return undefined;

    const description = meta(document, ['meta[property="og:description"]', 'meta[name="description"]', 'meta[name="twitter:description"]']);
    const thumbnail = meta(document, ['meta[property="og:image"]', 'meta[name="twitter:image"]']);

    const actorNames = uniqueStrings([
      ...all(document, ['a[href*="/actress/"]', 'a[href*="/actor/"]']),
      ...all(document, ['[itemprop="actor"]', '[class*="actress"] a', '[class*="actor"] a']),
    ]);
    const actors: MediaPerson[] = actorNames.map((name) => ({ name, role: 'actor' }));

    const tags = uniqueStrings([
      ...all(document, ['a[href*="/genre/"]', 'a[href*="/tags/"]', '.tag a', '.tags a']),
    ]);

    const videos: VideoVariant[] = [];
    const subtitles: SubtitleTrack[] = [];
    for (const source of Array.from(document.querySelectorAll('video source'))) {
      const src = absoluteUrl(url, source.getAttribute('src'));
      if (!src) continue;
      const label = source.getAttribute('label') ?? source.getAttribute('res') ?? source.getAttribute('data-quality') ?? 'Auto';
      videos.push({ label, url: src, type: source.getAttribute('type') ?? undefined });
    }
    for (const track of Array.from(document.querySelectorAll('video track, track[kind]'))) {
      const src = absoluteUrl(url, track.getAttribute('src'));
      if (!src) continue;
      subtitles.push({
        label: track.getAttribute('label') ?? track.getAttribute('srclang') ?? 'Subtitle',
        language: track.getAttribute('srclang') ?? undefined,
        url: src,
        kind: track.getAttribute('kind') === 'captions' ? 'captions' : 'subtitles',
      });
    }

    const year = title.match(/\b(19|20)\d{2}\b/)?.[0] ?? description?.match(/\b(19|20)\d{2}\b/)?.[0];

    return {
      url,
      provider: this.id,
      title,
      description,
      thumbnail,
      cast: actors,
      tags,
      genres: tags,
      mediaType: 'video',
      year: year ? Number(year) : undefined,
      sourceSite: host(url),
      subtitles: subtitles.map((track) => track.label),
      videoVariants: videos,
      subtitleTracks: subtitles,
    };
  }
}
