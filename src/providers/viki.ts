import type { MetadataProvider, ProviderContext } from './types';
import type { MetadataResult, MediaPerson } from '../types';
import { meta, text, all } from './helpers';

export class VikiProvider implements MetadataProvider {
  id = 'viki';
  displayName = 'Viki';
  matches(url: string): boolean {
    return (() => { try { return new URL(url).hostname.endsWith('viki.com'); } catch { return false; } })();
  }

  extract({ url, document }: ProviderContext): MetadataResult | undefined {
    const title = text(document.querySelector('h1')) ?? meta(document, ['meta[property="og:title"]']);
    if (!title) return undefined;
    const description = meta(document, ['meta[property="og:description"]', 'meta[name="description"]']);
    const thumbnail = meta(document, ['meta[property="og:image"]']);
    const body = document.body.textContent?.replace(/\s+/g, ' ') ?? '';
    const year = body.match(/\b(19|20)\d{2}\b/)?.[0];
    const episodes = body.match(/(\d+)\s+episodes/i)?.[1];
    const rating = document.querySelector('[aria-label*="out of 10"]')?.getAttribute('aria-label')?.match(/([\d.]+)\s+out of 10/)?.[1];

    const cast: MediaPerson[] = [];
    const starring = description?.match(/starring\s+(.+?)(?:\.|$)/i)?.[1];
    if (starring) {
      for (const part of starring.split(/\s+and\s+|,\s*/)) {
        const name = part.trim();
        if (name) cast.push({ name, role: 'cast' });
      }
    }

    return {
      url, provider: this.id, title, description, thumbnail, cast,
      genres: all(document, ['#genres li span', '[id="genres"] + span li']),
      subtitles: all(document, ['#subtitles span', '[id="subtitles"] + span']),
      year: year ? Number(year) : undefined,
      episodes: episodes ? Number(episodes) : undefined,
      rating: rating ? Number(rating) : undefined,
      mediaType: 'tv-series',
      sourceSite: 'Viki',
    };
  }
}
