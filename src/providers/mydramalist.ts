import type { MetadataProvider, ProviderContext } from './types';
import type { MetadataResult, MediaPerson } from '../types';
import { meta, text, labeled } from './helpers';

export class MyDramaListProvider implements MetadataProvider {
  id = 'mydramalist';
  displayName = 'MyDramaList';
  matches(url: string): boolean {
    return (() => { try { return new URL(url).hostname.endsWith('mydramalist.com'); } catch { return false; } })();
  }

  extract({ url, document }: ProviderContext): MetadataResult | undefined {
    const title = text(document.querySelector('h1.film-title')) ?? meta(document, ['meta[property="og:title"]']);
    if (!title) return undefined;
    const description = meta(document, ['meta[property="og:description"]', 'meta[name="description"]']);
    const thumbnail = meta(document, ['meta[property="og:image"]']) ?? document.querySelector('link[rel="image_src"]')?.getAttribute('href');

    const cast: MediaPerson[] = [];
    for (const node of Array.from(document.querySelectorAll('[itempropx="actor"] a[href*="/people/"], [itemprop="actor"] a[href*="/people/"]'))) {
      const name = text(node);
      if (name) cast.push({ name, role: text(node.parentElement?.querySelector('small')) ?? 'cast', url: node.getAttribute('href') ?? undefined });
    }

    const score = labeled(document, 'Score')?.match(/\d+(?:\.\d+)?/)?.[0];
    const duration = labeled(document, 'Duration')?.match(/\d+/)?.[0];

    return {
      url, provider: this.id, title, description, thumbnail, cast,
      genres: Array.from(document.querySelectorAll('a[href*="genre"]')).map(text).filter((v): v is string => Boolean(v)),
      country: labeled(document, 'Country'),
      mediaType: 'tv-series',
      episodes: Number(labeled(document, 'Episodes')) || undefined,
      releaseDate: labeled(document, 'Aired'),
      durationSeconds: duration ? Number(duration) * 60 : undefined,
      score: score ? Number(score) : undefined,
      network: labeled(document, 'Original Network'),
      status: labeled(document, 'Status'),
      sourceSite: 'MyDramaList',
    };
  }
}
