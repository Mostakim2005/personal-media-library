import { App, Modal, Notice, Setting } from 'obsidian';
import type { MediaEntry, MediaType } from '../types';
import type { MetadataResult } from '../types';
import { parseTimecode } from '../utils/time';

export class AddMediaModal extends Modal {
  private url = '';
  private title = '';
  private type: MediaType = 'other';
  private startSeconds?: number;
  private fetched?: MetadataResult;

  constructor(
    app: App,
    private readonly fetchMetadata: (url: string) => Promise<MetadataResult>,
    private readonly translate: (title: string) => Promise<string | undefined>,
    private readonly onSubmit: (entry: Omit<MediaEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>) => Promise<void>,
  ) {
    super(app);
  }

  override onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Add media' });

    new Setting(contentEl)
      .setName('Source URL')
      .setDesc('Paste a manga, anime, video, film, or series link.')
      .addText((text) => text
        .setPlaceholder('HTTPS://...')
        .onChange((value) => { this.url = value.trim(); }));

    new Setting(contentEl)
      .setName('Media type')
      .addDropdown((dropdown) => dropdown
        .addOptions({
          anime: 'Anime',
          manga: 'Manga',
          doujin: 'Doujin',
          movie: 'Movie',
          'tv-series': 'TV series',
          'live-action': 'Live action',
          'web-series': 'Web series',
          video: 'Video',
          other: 'Other',
        })
        .setValue(this.type)
        .onChange((value) => { this.type = value as MediaType; }));

    new Setting(contentEl)
      .setName('Start time')
      .setDesc('Optional starting timestamp such as 12:34.')
      .addText((text) => text
        .setPlaceholder('00:00')
        .onChange((value) => {
          this.startSeconds = parseTimecode(value) ?? undefined;
        }));

    const fetchButton = new Setting(contentEl)
      .setName('Fetch metadata')
      .addButton((button) => button
        .setButtonText('Fetch')
        .setCta()
        .onClick(() => { void this.fetch(); }));

    const saveButton = new Setting(contentEl)
      .setName('Create entry')
      .addButton((button) => button
        .setButtonText('Create')
        .setCta()
        .onClick(() => { void this.submit(); }));

    void fetchButton;
    void saveButton;
  }

  private async fetch(): Promise<void> {
    if (!this.url) {
      new Notice('Enter a source URL first.');
      return;
    }
    try {
      this.fetched = await this.fetchMetadata(this.url);
      this.title = this.fetched.title;
      new Notice(`Fetched metadata for ${this.title}`);
    } catch {
      new Notice('Metadata could not be fetched.');
    }
  }

  private async submit(): Promise<void> {
    if (!this.url) {
      new Notice('Enter a source URL first.');
      return;
    }

    const metadata = this.fetched ?? await this.fetchMetadata(this.url);
    const translated = await this.translate(metadata.title);

    await this.onSubmit({
      title: this.title || metadata.title,
      originalTitle: metadata.originalTitle ?? metadata.title,
      translatedTitle: translated,
      mediaType: this.type === 'other' ? (metadata.mediaType ?? 'other') : this.type,
      year: metadata.year,
      description: metadata.description,
      thumbnail: metadata.thumbnail,
      authors: metadata.authors ?? [],
      artists: metadata.artists ?? [],
      cast: metadata.cast ?? [],
      characters: metadata.characters ?? [],
      director: metadata.director ?? [],
      producer: metadata.producer ?? [],
      genres: metadata.genres ?? [],
      tags: metadata.tags ?? [],
      parody: metadata.parody ?? [],
      language: metadata.language,
      country: metadata.country,
      status: metadata.status,
      durationSeconds: metadata.durationSeconds,
      episodes: metadata.episodes,
      chapters: metadata.chapters,
      volumes: metadata.volumes,
      rating: metadata.rating,
      score: metadata.score,
      sourceSite: metadata.sourceSite,
      episodeTitle: metadata.episodeTitle,
      subtitles: metadata.subtitles ?? [],
      studio: metadata.studio,
      network: metadata.network,
      sources: [{
        id: `source-${Date.now().toString(36)}`,
        url: this.url,
        label: metadata.siteName ?? new URL(this.url).hostname,
        thumbnail: metadata.thumbnail,
        description: metadata.description,
        addedAt: Date.now(),
        isPrimary: true,
        startSeconds: this.startSeconds,
        videoVariants: metadata.videoVariants,
        subtitleTracks: metadata.subtitleTracks,
      }],
      scenes: (metadata.chapterMarkers ?? []).map((marker) => ({
        id: `scene-${marker.startSeconds}-${Date.now().toString(36)}`,
        startSeconds: marker.startSeconds,
        title: marker.title,
        tags: [],
        people: [],
      })),
      pageMarkers: [],
      pages: metadata.pages ?? [],
      collections: [],
      favorite: false,
      userStatus: 'unwatched',
      relations: [],
      provenance: [],
      notes: '',
      playback: {},
    });

    this.close();
  }
}
