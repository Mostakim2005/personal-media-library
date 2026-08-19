import type { MetadataProvider, ProviderContext } from './types';
import type { MetadataResult, MediaPerson } from '../types';
import { meta, text } from './helpers';

export class IMDbProvider implements MetadataProvider {
  id = 'imdb';
  displayName = 'IMDb';
  matches(url: string): boolean {
    return (() => { try { return new URL(url).hostname.endsWith('imdb.com'); } catch { return false; } })();
  }

  extract({ url, document }: ProviderContext): MetadataResult | undefined {
    const title = text(document.querySelector('h1')) ?? meta(document, ['meta[property="og:title"]']);
    if (!title) return undefined;
    const ogTitle = meta(document, ['meta[property="og:title"]']) ?? '';
    const description = text(document.querySelector('[data-testid="plot-xl"]'))
      ?? meta(document, ['meta[name="description"]']);
    const thumbnail = meta(document, ['meta[property="og:image"]']);
    const cast: MediaPerson[] = [];
    for (const a of Array.from(document.querySelectorAll('a[href*="/name/"]')).slice(0, 12)) {
      const name = text(a);
      if (name && !cast.some((p) => p.name === name)) cast.push({ name, role: 'cast', url: a.getAttribute('href') ?? undefined });
    }
    const score = ogTitle.match(/⭐\s*([\d.]+)/)?.[1];
    const year = title.match(/\b(19|20)\d{2}\b/)?.[0];
    const duration = meta(document, ['meta[property="og:description"]'])?.match(/(\d+)\s*m/i)?.[1];
    return {
      url, provider: this.id, title, description, thumbnail, cast,
      year: year ? Number(year) : undefined,
      durationSeconds: duration ? Number(duration) * 60 : undefined,
      score: score ? Number(score) : undefined,
      mediaType: /TV Series|Series|TV/.test(ogTitle) ? 'tv-series' : 'movie',
      sourceSite: 'IMDb',
    };
  }
}
