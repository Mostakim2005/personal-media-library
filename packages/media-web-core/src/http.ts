import { requestUrl } from 'obsidian';
import { MetadataCache } from './cache';
import { normalizeUrl } from './url';
import type { RequestOptions } from './types';

export interface CoreResponse {
  text: string;
  status: number;
  headers: Record<string, string>;
}

export class MediaHttpClient {
  constructor(
    private readonly cache = new MetadataCache(),
    private readonly getSessionCookie?: (url: string) => string | undefined,
  ) {}

  async get(options: RequestOptions): Promise<CoreResponse> {
    const key = `${options.method ?? 'GET'}:${normalizeUrl(options.url)}:${this.getSessionCookie?.(options.url) ? 'session' : 'public'}`;
    const cached = this.cache.get<CoreResponse>(key);
    if (cached) return cached;

    const cookie = this.getSessionCookie?.(options.url);
    const response = await requestUrl({
      url: options.url,
      method: options.method ?? 'GET',
      headers: {
        ...(options.headers ?? {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      throw: false,
    });

    const result: CoreResponse = {
      text: response.text,
      status: response.status,
      headers: response.headers,
    };
    this.cache.set(key, result, options.ttlMs);
    return result;
  }

  clearCache(): void { this.cache.clear(); }
}
