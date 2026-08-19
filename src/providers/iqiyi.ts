import type { MetadataProvider, ProviderContext } from './types';
import type { MetadataResult } from '../types';
import { meta } from './helpers';

export class IQIYIProvider implements MetadataProvider {
  id = 'iqiyi';
  displayName = 'iQIYI';
  matches(url: string): boolean {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
      return host.endsWith('iq.com') || host.endsWith('iqiyi.com');
    } catch { return false; }
  }

  extract({ url, document }: ProviderContext): MetadataResult | undefined {
    const title = meta(document, ['meta[property="og:title"]', 'title']);
    if (!title) return undefined;
    const description = meta(document, ['meta[property="og:description"]', 'meta[name="description"]']);
    const thumbnail = meta(document, ['meta[property="og:image"]']);
    const director = Array.from(document.querySelectorAll('meta[property="og:video:director"]'))
      .map((n) => n.getAttribute('content')?.trim()).filter((v): v is string => Boolean(v))
      .map((name) => ({ name, role: 'director' }));
    const cast = Array.from(document.querySelectorAll('meta[property="og:video:actor"]'))
      .map((n) => n.getAttribute('content')?.trim()).filter((v): v is string => Boolean(v))
      .map((name) => ({ name, role: 'actor' }));
    const year = title.match(/\b(19|20)\d{2}\b/)?.[0] ?? description?.match(/\b(19|20)\d{2}\b/)?.[0];

    return {
      url, provider: this.id, title, description, thumbnail, director, cast,
      year: year ? Number(year) : undefined,
      mediaType: 'tv-series', sourceSite: 'iQIYI',
    };
  }
}
