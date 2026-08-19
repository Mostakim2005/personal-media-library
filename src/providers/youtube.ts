import type { MetadataProvider, ProviderContext } from './types';
import type { MetadataResult } from '../types';
import { meta, text } from './helpers';

export class YouTubeProvider implements MetadataProvider {
  id = 'youtube';
  displayName = 'YouTube';
  matches(url: string): boolean {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
      return host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be';
    } catch { return false; }
  }

  extract({ url, document }: ProviderContext): MetadataResult | undefined {
    const title = text(document.querySelector('h1')) ?? meta(document, ['meta[property="og:title"]', 'title']);
    if (!title) return undefined;
    const thumbnail = meta(document, ['meta[property="og:image"]']);
    const description = meta(document, ['meta[property="og:description"]', 'meta[name="description"]']);
    const playlist = url.includes('list=') || url.includes('/playlist');
    return {
      url, provider: this.id, title, thumbnail, description,
      mediaType: 'video', sourceSite: 'YouTube',
      tags: playlist ? ['playlist'] : [],
    };
  }
}
