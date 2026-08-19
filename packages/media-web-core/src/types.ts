export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttlMs: number;
  maxEntries: number;
}

export interface RequestOptions {
  url: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'HEAD';
  ttlMs?: number;
  signal?: AbortSignal;
}

export interface SessionDescriptor {
  id: string;
  domains: string[];
}

export interface MediaCapabilities {
  metadata: boolean;
  image: boolean;
  html5Video: boolean;
  iframe: boolean;
  timestampUrl: boolean;
  seek: boolean;
  subtitles: boolean;
  qualitySelection: boolean;
  playbackSpeed: boolean;
  chapters: boolean;
}

export interface TimestampMarker {
  startSeconds: number;
  title: string;
}
