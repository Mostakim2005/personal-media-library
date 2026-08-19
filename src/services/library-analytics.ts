import type { MediaEntry, MediaType } from '../types';

export interface LibraryAnalytics {
  total: number;
  byType: Record<MediaType, number>;
  favorites: number;
  completed: number;
  watching: number;
  paused: number;
  averageRating?: number;
  totalWatchSeconds: number;
  collections: Array<{ name: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
}

export function buildAnalytics(entries: MediaEntry[]): LibraryAnalytics {
  const byType = {} as Record<MediaType, number>;
  const tagMap = new Map<string, number>();
  const collectionMap = new Map<string, number>();
  let favorites = 0;
  let completed = 0;
  let watching = 0;
  let paused = 0;
  let ratingTotal = 0;
  let ratingCount = 0;
  let totalWatchSeconds = 0;

  for (const entry of entries) {
    byType[entry.mediaType] = (byType[entry.mediaType] ?? 0) + 1;
    if (entry.favorite) favorites += 1;
    if (entry.userStatus === 'completed') completed += 1;
    if (entry.userStatus === 'watching') watching += 1;
    if (entry.userStatus === 'paused') paused += 1;
    if (entry.rating !== undefined) { ratingTotal += entry.rating; ratingCount += 1; }
    for (const state of Object.values(entry.playback)) totalWatchSeconds += state.positionSeconds;
    for (const tag of entry.tags) tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    for (const collection of entry.collections) collectionMap.set(collection, (collectionMap.get(collection) ?? 0) + 1);
  }

  return {
    total: entries.length,
    byType,
    favorites,
    completed,
    watching,
    paused,
    averageRating: ratingCount ? ratingTotal / ratingCount : undefined,
    totalWatchSeconds,
    collections: [...collectionMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    topTags: [...tagMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count })),
  };
}
