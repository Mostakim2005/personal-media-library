export type MediaType =
  | 'anime' | 'manga' | 'doujin' | 'movie' | 'tv-series'
  | 'live-action' | 'web-series' | 'video' | 'other';

export type ViewMode = 'grid' | 'list';
export type DetailLevel = 'minimal' | 'standard' | 'professional' | 'custom';

export type RelationshipType = 'adaptation-of' | 'adapted-into' | 'sequel-to' | 'prequel-to' | 'spin-off-of' | 'remake-of' | 'related-to' | 'same-universe';

export type MetadataField =
  | 'title' | 'originalTitle' | 'translatedTitle' | 'thumbnail' | 'description'
  | 'authors' | 'artists' | 'cast' | 'characters' | 'director' | 'producer'
  | 'studio' | 'network' | 'genres' | 'tags' | 'parody' | 'language' | 'country'
  | 'year' | 'releaseDate' | 'status' | 'duration' | 'episodes' | 'chapters'
  | 'volumes' | 'rating' | 'score' | 'sourceSite' | 'episodeTitle' | 'subtitles';

export const ALL_METADATA_FIELDS: MetadataField[] = [
  'title', 'originalTitle', 'translatedTitle', 'thumbnail', 'description',
  'authors', 'artists', 'cast', 'characters', 'director', 'producer', 'studio',
  'network', 'genres', 'tags', 'parody', 'language', 'country', 'year',
  'releaseDate', 'status', 'duration', 'episodes', 'chapters', 'volumes',
  'rating', 'score', 'sourceSite', 'episodeTitle', 'subtitles',
];

export interface MediaPerson {
  name: string;
  role?: string;
  character?: string;
  url?: string;
  image?: string;
}

export interface SceneMarker {
  id: string;
  startSeconds: number;
  endSeconds?: number;
  title: string;
  description?: string;
  tags: string[];
  people: string[];
}

export interface PageMarker {
  id: string;
  page: number;
  title: string;
  description?: string;
  tags: string[];
  people: string[];
}

export interface MediaPage {
  page: number;
  url: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface VideoVariant {
  label: string;
  url: string;
  type?: string;
}

export interface SubtitleTrack {
  label: string;
  language?: string;
  url: string;
  kind?: 'subtitles' | 'captions' | 'descriptions';
}

export interface PlaybackState {
  positionSeconds: number;
  durationSeconds?: number;
  completed: boolean;
  updatedAt: number;
}

export interface MediaSource {
  id: string;
  url: string;
  label: string;
  type?: string;
  thumbnail?: string;
  description?: string;
  sourceTitle?: string;
  addedAt: number;
  isPrimary: boolean;
  startSeconds?: number;
  supportsEmbedding?: boolean;
  supportsProgrammaticSeek?: boolean;
  supportsTimestampLinks?: boolean;
  videoVariants?: VideoVariant[];
  subtitleTracks?: SubtitleTrack[];
  chapterMarkers?: Array<{ startSeconds: number; title: string }>;
}

export interface MediaRelation {
  targetId: string;
  type: RelationshipType;
  note?: string;
}

export interface MetadataProvenance {
  field: MetadataField | 'cast' | 'description' | 'thumbnail' | 'other';
  sources: string[];
}

export interface MediaEntry {
  schemaVersion: number;
  id: string;
  title: string;
  originalTitle?: string;
  translatedTitle?: string;
  mediaType: MediaType;
  thumbnail?: string;
  description?: string;
  authors: MediaPerson[];
  artists: MediaPerson[];
  cast: MediaPerson[];
  characters: MediaPerson[];
  director: MediaPerson[];
  producer: MediaPerson[];
  genres: string[];
  tags: string[];
  parody: string[];
  language?: string;
  country?: string;
  year?: number;
  releaseDate?: string;
  status?: string;
  durationSeconds?: number;
  episodes?: number;
  chapters?: number;
  volumes?: number;
  rating?: number;
  score?: number;
  sourceSite?: string;
  episodeTitle?: string;
  subtitles: string[];
  studio?: string;
  network?: string;
  sources: MediaSource[];
  scenes: SceneMarker[];
  pageMarkers: PageMarker[];
  pages: MediaPage[];
  notes?: string;
  collections: string[];
  favorite: boolean;
  userStatus?: 'unwatched' | 'watching' | 'completed' | 'paused' | 'dropped';
  relations: MediaRelation[];
  provenance: MetadataProvenance[];
  playback: Record<string, PlaybackState>;
  createdAt: number;
  updatedAt: number;
}

export interface LibrarySettings {
  libraryFolder: string;
  viewMode: ViewMode;
  detailLevel: DetailLevel;
  fields: Record<MetadataField, boolean>;
  enablePlayers: boolean;
  enableSceneCapture: boolean;
  enableAutoMetadata: boolean;
  enableTitleTranslation: boolean;
  translationMode: 'off' | 'jisho';
  maxDescriptionLength: number;
  maxImages: number;
  autoDetectTimestampUrls: boolean;
}

export interface MetadataResult {
  url: string;
  provider?: string;
  siteName?: string;
  title: string;
  originalTitle?: string;
  description?: string;
  thumbnail?: string;
  images?: string[];
  authors?: MediaPerson[];
  artists?: MediaPerson[];
  cast?: MediaPerson[];
  characters?: MediaPerson[];
  director?: MediaPerson[];
  producer?: MediaPerson[];
  genres?: string[];
  tags?: string[];
  parody?: string[];
  language?: string;
  country?: string;
  year?: number;
  releaseDate?: string;
  status?: string;
  durationSeconds?: number;
  episodes?: number;
  chapters?: number;
  volumes?: number;
  rating?: number;
  score?: number;
  sourceSite?: string;
  episodeTitle?: string;
  subtitles?: string[];
  studio?: string;
  network?: string;
  mediaType?: MediaType;
  pages?: MediaPage[];
  videoVariants?: VideoVariant[];
  subtitleTracks?: SubtitleTrack[];
  chapterMarkers?: Array<{ startSeconds: number; title: string }>;
}
