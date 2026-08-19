import type { MetadataResult, MediaType } from '../types';
import type { MetadataProvider, ProviderContext } from './types';
import { hostname } from './types';
import { meta, jsonLd, absoluteUrl, uniqueStrings } from './helpers';

function guessType(title: string, description: string): MediaType {
  const hay = `${title} ${description}`.toLowerCase();
  if (/doujin/.test(hay)) return 'doujin';
  if (/manga|manhwa|manhua|comic/.test(hay)) return 'manga';
  if (/anime|episode|ova|season/.test(hay)) return 'anime';
  if (/live.?action/.test(hay)) return 'live-action';
  if (/movie|film/.test(hay)) return 'movie';
  if (/tv|series|drama/.test(hay)) return 'tv-series';
  if (/youtube|video|playlist/.test(hay)) return 'video';
  return 'other';
}

export class GenericProvider implements MetadataProvider {
  id = 'generic';
  displayName = 'Generic';
  matches(_url: string): boolean { return true; }

  extract({ url, document }: ProviderContext): MetadataResult | undefined {
    const title = meta(document, ['meta[property="og:title"]', 'meta[name="twitter:title"]', 'title']);
    if (!title) return undefined;
    const description = meta(document, [
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ]);

    const images = Array.from(document.querySelectorAll(
      'meta[property="og:image"], meta[name="twitter:image"], link[rel="image_src"]',
    ))
      .map((node) => absoluteUrl(url, node.getAttribute('content') ?? node.getAttribute('href')))
      .filter((v): v is string => Boolean(v));

    const structured = jsonLd(document).filter((value): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null && !Array.isArray(value));

    const peopleFrom = (key: string, role: string) => structured.flatMap((item) => {
      const raw = item[key];
      const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
      return values.flatMap((value) => {
        if (typeof value === 'string') return [{ name: value, role }];
        if (value && typeof value === 'object') {
          const record = value as Record<string, unknown>;
          return typeof record.name === 'string' ? [{ name: record.name, role, url: typeof record.url === 'string' ? record.url : undefined }] : [];
        }
        return [];
      });
    });

    const cast = peopleFrom('actor', 'actor');
    const director = peopleFrom('director', 'director');
    const producer = peopleFrom('producer', 'producer');
    const authors = uniqueStrings(structured.flatMap((item) => {
      const raw = item['author'];
      const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
      return values.map((value) => typeof value === 'string' ? value : (value && typeof value === 'object' && typeof (value as Record<string, unknown>).name === 'string' ? (value as Record<string, unknown>).name as string : undefined));
    })).map((name) => ({ name, role: 'author' }));

    const year = title.match(/\b(19|20)\d{2}\b/)?.[0] ??
      description?.match(/\b(19|20)\d{2}\b/)?.[0];

    const videoVariants = Array.from(document.querySelectorAll('video source[src], source[type^="video/"]'))
      .map((node) => {
        const source = absoluteUrl(url, node.getAttribute('src'));
        if (!source) return undefined;
        return {
          label: node.getAttribute('label') ?? node.getAttribute('size') ?? node.getAttribute('res') ?? 'Video',
          url: source,
          type: node.getAttribute('type') ?? undefined,
        };
      })
      .filter((v): v is NonNullable<typeof v> => Boolean(v));

    const subtitleTracks = Array.from(document.querySelectorAll('track[src]'))
      .map((node) => {
        const source = absoluteUrl(url, node.getAttribute('src'));
        if (!source) return undefined;
        return {
          label: node.getAttribute('label') ?? node.getAttribute('srclang') ?? 'Subtitle',
          language: node.getAttribute('srclang') ?? undefined,
          url: source,
          kind: node.getAttribute('kind') === 'captions' ? 'captions' as const : 'subtitles' as const,
        };
      })
      .filter((v): v is NonNullable<typeof v> => Boolean(v));

    return {
      url,
      provider: this.id,
      title,
      description,
      thumbnail: images[0],
      images,
      authors,
      cast,
      director,
      producer,
      sourceSite: hostname(url),
      year: year ? Number(year) : undefined,
      mediaType: guessType(title, description ?? ''),
      videoVariants,
      subtitleTracks,
      subtitles: subtitleTracks.map((track) => track.label),
    };
  }
}
