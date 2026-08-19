import { MetadataCache, MediaHttpClient, extractTimestampMarkers } from '../../packages/media-web-core/src';
import type { MetadataResult } from '../types';
import { createProviders } from '../providers/registry';
import type { ProviderContext, MetadataProvider } from '../providers/types';
import { CookieSessionManager } from './cookies';

export class MetadataService {
  private readonly providers: MetadataProvider[] = createProviders();
  private readonly cache = new MetadataCache({ ttlMs: 6 * 60 * 60 * 1000, maxEntries: 200 });
  private readonly core: MediaHttpClient;

  constructor(private readonly cookies?: CookieSessionManager) {
    this.core = new MediaHttpClient(this.cache, (targetUrl) => this.cookies?.getForUrl(targetUrl));
  }

  clearCache(): void {
    this.core.clearCache();
  }

  async fetch(url: string): Promise<MetadataResult> {
    const response = await this.core.get({ url, method: 'GET' });
    const context: ProviderContext = {
      url,
      html: response.text,
      document: new DOMParser().parseFromString(response.text, 'text/html'),
    };

    for (const provider of this.providers) {
      if (!provider.matches(url)) continue;
      try {
        const result = provider.extract(context);
        if (result) return this.normalize(result);
      } catch {
        // Provider-specific parsing must not prevent generic fallback providers.
      }
    }
    throw new Error(`No metadata provider could handle ${url}`);
  }

  private normalize(result: MetadataResult): MetadataResult {
    const dedupe = (values?: string[]): string[] | undefined =>
      values ? [...new Set(values.map((v) => v.trim()).filter(Boolean))] : undefined;
    return {
      ...result,
      genres: dedupe(result.genres),
      tags: dedupe(result.tags),
      parody: dedupe(result.parody),
      subtitles: dedupe(result.subtitles),
      images: dedupe(result.images),
      chapterMarkers: result.chapterMarkers ?? extractTimestampMarkers(result.description ?? ''),
    };
  }
}
