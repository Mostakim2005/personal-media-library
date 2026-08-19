import type { MetadataProvider, ProviderContext } from './types';
import type { MetadataResult, MediaPerson } from '../types';
import { meta, attr, text } from './helpers';

export class MyAnimeListProvider implements MetadataProvider {
  id = 'myanimelist';
  displayName = 'MyAnimeList';
  matches(url: string): boolean {
    return (() => { try { return new URL(url).hostname.endsWith('myanimelist.net'); } catch { return false; } })();
  }

  extract({ url, document }: ProviderContext): MetadataResult | undefined {
    const title = meta(document, ['meta[property="og:title"]', 'title']);
    if (!title) return undefined;
    const description = meta(document, ['meta[property="og:description"]', 'meta[name="description"]']);
    const thumbnail = meta(document, ['meta[property="og:image"]'])
      ?? attr(document, ['link[rel="image_src"]'], 'href');

    const rows = new Map<string, string>();
    for (const row of Array.from(document.querySelectorAll('tr'))) {
      const label = text(row.querySelector('.list-title'));
      const value = text(row.querySelector('td:nth-child(2)'));
      if (label && value) rows.set(label, value);
    }

    const authors: MediaPerson[] = [];
    for (const row of Array.from(document.querySelectorAll('tr'))) {
      if (!/^Authors/i.test(text(row) ?? '')) continue;
      for (const a of Array.from(row.querySelectorAll('a'))) {
        const name = text(a);
        if (name) authors.push({ name, role: 'author / artist', url: a.getAttribute('href') ?? undefined });
      }
    }

    const typeText = rows.get('Type')?.toLowerCase() ?? '';
    const mediaType = typeText.includes('manga') ? 'manga' : typeText.includes('anime') ? 'anime' : 'other';
    const score = rows.get('Score')?.match(/\d+(?:\.\d+)?/)?.[0];
    const genres = rows.get('Genre')?.split(/\s+/).filter(Boolean);

    return {
      url, provider: this.id, title, description, thumbnail, authors,
      genres, tags: genres, mediaType,
      year: rows.get('Published')?.match(/\b(19|20)\d{2}\b/)?.[0] ? Number(rows.get('Published')!.match(/\b(19|20)\d{2}\b/)![0]) : undefined,
      status: rows.get('Status'),
      chapters: Number(rows.get('Chapters')) || undefined,
      volumes: Number(rows.get('Volumes')) || undefined,
      score: score ? Number(score) : undefined,
      sourceSite: 'MyAnimeList',
      originalTitle: rows.get('Japanese'),
    };
  }
}
