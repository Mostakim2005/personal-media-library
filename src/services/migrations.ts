import type { LibrarySettings, MediaEntry } from '../types';
import { normalizeSettings } from '../settings';

export const CURRENT_SCHEMA_VERSION = 3;

interface VersionedMediaEntry extends MediaEntry {
  schemaVersion?: number;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

export function migrateMediaEntry(value: unknown): MediaEntry | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Partial<VersionedMediaEntry> & Record<string, unknown>;
  if (typeof raw.id !== 'string' || typeof raw.title !== 'string') return undefined;

  const entry: MediaEntry = {
    ...(raw as MediaEntry),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    authors: asArray(raw.authors),
    artists: asArray(raw.artists),
    cast: asArray(raw.cast),
    characters: asArray(raw.characters),
    director: asArray(raw.director),
    producer: asArray(raw.producer),
    genres: asArray(raw.genres),
    tags: asArray(raw.tags),
    parody: asArray(raw.parody),
    subtitles: asArray(raw.subtitles),
    sources: asArray(raw.sources),
    scenes: asArray(raw.scenes),
    pageMarkers: asArray(raw.pageMarkers),
    pages: asArray(raw.pages),
    collections: asArray(raw.collections),
    relations: asArray(raw.relations),
    provenance: asArray(raw.provenance),
    playback: raw.playback && typeof raw.playback === 'object' ? raw.playback as MediaEntry['playback'] : {},
    favorite: typeof raw.favorite === 'boolean' ? raw.favorite : false,
    userStatus: raw.userStatus === 'watching' || raw.userStatus === 'completed' || raw.userStatus === 'paused' || raw.userStatus === 'dropped'
      ? raw.userStatus
      : 'unwatched',
  };

  return entry;
}

export function migrateSettings(value: unknown): LibrarySettings {
  return normalizeSettings(value);
}
