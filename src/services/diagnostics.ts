import type { MediaEntry } from '../types';

export interface LibraryDiagnostics {
  total: number;
  invalid: number;
  withSources: number;
  withPlayback: number;
  withScenes: number;
  schemaVersions: Record<string, number>;
}

export function buildDiagnostics(entries: MediaEntry[]): LibraryDiagnostics {
  const schemaVersions: Record<string, number> = {};
  let invalid = 0;
  for (const entry of entries) {
    if (!entry.id || !entry.title) invalid += 1;
    const key = String(entry.schemaVersion ?? 0);
    schemaVersions[key] = (schemaVersions[key] ?? 0) + 1;
  }
  return {
    total: entries.length,
    invalid,
    withSources: entries.filter((entry) => entry.sources.length > 0).length,
    withPlayback: entries.filter((entry) => Object.keys(entry.playback).length > 0).length,
    withScenes: entries.filter((entry) => entry.scenes.length > 0).length,
    schemaVersions,
  };
}
