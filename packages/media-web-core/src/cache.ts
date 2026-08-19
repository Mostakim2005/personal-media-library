import type { CacheEntry, CacheOptions } from './types';

export class MetadataCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  constructor(private readonly options: CacheOptions = { ttlMs: 1000 * 60 * 60 * 6, maxEntries: 200 }) {}

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = this.options.ttlMs): void {
    const entry: CacheEntry<T> = { value, createdAt: Date.now(), expiresAt: Date.now() + ttlMs };
    this.entries.delete(key);
    this.entries.set(key, entry as CacheEntry<unknown>);
    while (this.entries.size > this.options.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  clear(): void { this.entries.clear(); }
  size(): number { return this.entries.size; }
}
