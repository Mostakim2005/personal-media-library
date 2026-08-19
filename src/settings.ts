import type { LibrarySettings, MetadataField } from './types';
import { ALL_METADATA_FIELDS } from './types';
export { ALL_METADATA_FIELDS } from './types';

export const MINIMAL_FIELDS: MetadataField[] = ['title', 'thumbnail', 'description'];
export const STANDARD_FIELDS: MetadataField[] = [
  ...MINIMAL_FIELDS, 'originalTitle', 'authors', 'artists', 'genres', 'tags',
  'year', 'rating', 'sourceSite',
];

function mapFor(enabled: MetadataField[]): Record<MetadataField, boolean> {
  return Object.fromEntries(ALL_METADATA_FIELDS.map((f) => [f, enabled.includes(f)])) as Record<MetadataField, boolean>;
}

export const SETTINGS_SCHEMA_VERSION = 2;

export const DEFAULT_SETTINGS: LibrarySettings = {
  libraryFolder: 'Media Library',
  viewMode: 'grid',
  detailLevel: 'standard',
  fields: mapFor(STANDARD_FIELDS),
  enablePlayers: true,
  enableSceneCapture: true,
  enableAutoMetadata: true,
  enableTitleTranslation: false,
  translationMode: 'jisho',
  maxDescriptionLength: 800,
  maxImages: 12,
  autoDetectTimestampUrls: true,
  dashboardVisible: true,
  enableDuplicateDetection: true,
};

export function normalizeSettings(value: unknown): LibrarySettings {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const fields = { ...DEFAULT_SETTINGS.fields };
  if (raw.fields && typeof raw.fields === 'object') {
    for (const field of ALL_METADATA_FIELDS) {
      const v = (raw.fields as Record<string, unknown>)[field];
      if (typeof v === 'boolean') fields[field] = v;
    }
  }
  const detailLevel: DetailLevelValue = raw.detailLevel === 'minimal' || raw.detailLevel === 'standard' ||
    raw.detailLevel === 'professional' || raw.detailLevel === 'custom' ? raw.detailLevel : 'standard';

  return {
    ...DEFAULT_SETTINGS,
    libraryFolder: typeof raw.libraryFolder === 'string' && raw.libraryFolder.trim()
      ? raw.libraryFolder.trim() : DEFAULT_SETTINGS.libraryFolder,
    viewMode: raw.viewMode === 'list' ? 'list' : 'grid',
    detailLevel,
    fields,
    enablePlayers: typeof raw.enablePlayers === 'boolean' ? raw.enablePlayers : true,
    enableSceneCapture: typeof raw.enableSceneCapture === 'boolean' ? raw.enableSceneCapture : true,
    enableAutoMetadata: typeof raw.enableAutoMetadata === 'boolean' ? raw.enableAutoMetadata : true,
    enableTitleTranslation: typeof raw.enableTitleTranslation === 'boolean' ? raw.enableTitleTranslation : false,
    translationMode: raw.translationMode === 'off' ? 'off' : 'jisho',
    maxDescriptionLength: typeof raw.maxDescriptionLength === 'number'
      ? Math.min(4000, Math.max(100, raw.maxDescriptionLength)) : 800,
    maxImages: typeof raw.maxImages === 'number'
      ? Math.min(20, Math.max(1, raw.maxImages)) : 12,
    autoDetectTimestampUrls: typeof raw.autoDetectTimestampUrls === 'boolean' ? raw.autoDetectTimestampUrls : true,
    dashboardVisible: typeof raw.dashboardVisible === 'boolean' ? raw.dashboardVisible : true,
    enableDuplicateDetection: typeof raw.enableDuplicateDetection === 'boolean' ? raw.enableDuplicateDetection : true,
  };
}

type DetailLevelValue = LibrarySettings['detailLevel'];

export function applyDetailPreset(settings: LibrarySettings, level: Exclude<DetailLevelValue, 'custom'>): void {
  let enabled: MetadataField[];
  if (level === 'minimal') enabled = MINIMAL_FIELDS;
  else if (level === 'standard') enabled = STANDARD_FIELDS;
  else enabled = ALL_METADATA_FIELDS;
  settings.detailLevel = level;
  settings.fields = mapFor(enabled);
}
