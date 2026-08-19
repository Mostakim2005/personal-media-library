import { Modal } from 'obsidian';
import type { LibrarySettings, MediaEntry, MediaSource } from '../types';
import { MediaPlayer } from './media-player';
import { formatTimecode } from '../utils/time';
import { OrganizationModal } from './organization-modal';

function enabled(settings: LibrarySettings, field: keyof LibrarySettings['fields']): boolean {
  return settings.fields[field];
}

function names(values: MediaEntry['authors']): string {
  return values.map((person) => person.name).filter(Boolean).join(', ');
}

export class MediaDetailModal extends Modal {
  private player?: MediaPlayer;

  constructor(
    app: import('obsidian').App,
    private readonly entry: MediaEntry,
    private readonly settings: LibrarySettings,
    private readonly onSceneCapture: (seconds: number) => void,
    private readonly onPersistScene?: (seconds: number) => Promise<void>,
    private readonly allEntries: MediaEntry[] = [],
    private readonly onPersistOrganization?: (update: Partial<MediaEntry>) => Promise<void>,
    private readonly onPersistPlayback?: (sourceId: string, positionSeconds: number, durationSeconds?: number, completed?: boolean) => Promise<void>,
  ) {
    super(app);
  }

  override onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pml-detail');

    if (enabled(this.settings, 'thumbnail') && this.entry.thumbnail) {
      const image = contentEl.createEl('img', { cls: 'pml-detail-image' });
      image.src = this.entry.thumbnail;
      image.alt = this.entry.title;
      image.loading = 'lazy';
    }

    if (enabled(this.settings, 'title')) {
      contentEl.createEl('h2', { text: this.entry.translatedTitle || this.entry.title });
    }
    if (enabled(this.settings, 'originalTitle') && this.entry.originalTitle && this.entry.originalTitle !== this.entry.title) {
      contentEl.createEl('div', { cls: 'pml-original-title', text: this.entry.originalTitle });
    }
    if (enabled(this.settings, 'translatedTitle') && this.entry.translatedTitle) {
      contentEl.createEl('div', { cls: 'pml-original-title', text: this.entry.translatedTitle });
    }

    const meta = contentEl.createDiv({ cls: 'pml-detail-meta' });
    meta.createSpan({ text: this.entry.mediaType });
    if (enabled(this.settings, 'year') && this.entry.year) meta.createSpan({ text: String(this.entry.year) });
    if (enabled(this.settings, 'rating') && this.entry.rating !== undefined) meta.createSpan({ text: `★ ${this.entry.rating.toFixed(1)}` });
    if (enabled(this.settings, 'score') && this.entry.score !== undefined) meta.createSpan({ text: `Score ${this.entry.score.toFixed(1)}` });
    if (enabled(this.settings, 'duration') && this.entry.durationSeconds !== undefined) meta.createSpan({ text: formatTimecode(this.entry.durationSeconds) });

    if (enabled(this.settings, 'description') && this.entry.description) {
      contentEl.createEl('p', { text: this.entry.description });
    }

    const groups: Array<[keyof LibrarySettings['fields'], string, MediaEntry['authors']]> = [
      ['authors', 'Authors and creators', this.entry.authors],
      ['artists', 'Artists', this.entry.artists],
      ['cast', 'Cast', this.entry.cast],
      ['characters', 'Characters', this.entry.characters],
      ['director', 'Directors', this.entry.director],
      ['producer', 'Producers', this.entry.producer],
    ];
    for (const [field, heading, value] of groups) {
      if (enabled(this.settings, field) && value.length) {
        contentEl.createEl('h3', { text: heading });
        contentEl.createEl('div', { text: names(value) });
      }
    }

    if (enabled(this.settings, 'genres') && this.entry.genres.length) {
      contentEl.createEl('h3', { text: 'Genres' });
      contentEl.createEl('div', { text: this.entry.genres.join(' · ') });
    }
    if (enabled(this.settings, 'tags') && this.entry.tags.length) {
      contentEl.createEl('h3', { text: 'Tags' });
      contentEl.createEl('div', { text: this.entry.tags.join(' · ') });
    }
    if (enabled(this.settings, 'parody') && this.entry.parody.length) {
      contentEl.createEl('h3', { text: 'Parody / source work' });
      contentEl.createEl('div', { text: this.entry.parody.join(' · ') });
    }
    if (enabled(this.settings, 'country') && this.entry.country) contentEl.createEl('div', { text: `Country: ${this.entry.country}` });
    if (enabled(this.settings, 'language') && this.entry.language) contentEl.createEl('div', { text: `Language: ${this.entry.language}` });
    if (enabled(this.settings, 'status') && this.entry.status) contentEl.createEl('div', { text: `Status: ${this.entry.status}` });
    if (enabled(this.settings, 'releaseDate') && this.entry.releaseDate) contentEl.createEl('div', { text: `Release: ${this.entry.releaseDate}` });
    if (enabled(this.settings, 'episodes') && this.entry.episodes) contentEl.createEl('div', { text: `Episodes: ${this.entry.episodes}` });
    if (enabled(this.settings, 'chapters') && this.entry.chapters) contentEl.createEl('div', { text: `Chapters / pages: ${this.entry.chapters}` });
    if (enabled(this.settings, 'volumes') && this.entry.volumes) contentEl.createEl('div', { text: `Volumes: ${this.entry.volumes}` });
    if (enabled(this.settings, 'studio') && this.entry.studio) contentEl.createEl('div', { text: `Studio: ${this.entry.studio}` });
    if (enabled(this.settings, 'network') && this.entry.network) contentEl.createEl('div', { text: `Network: ${this.entry.network}` });
    if (enabled(this.settings, 'subtitles') && this.entry.subtitles.length) contentEl.createEl('div', { text: `Subtitles: ${this.entry.subtitles.join(', ')}` });

    const orgButton = contentEl.createEl('button', { text: 'Organize' });
    orgButton.addEventListener('click', () => new OrganizationModal(
      this.app,
      this.entry,
      this.allEntries,
      async (update) => { await this.onPersistOrganization?.(update); },
    ).open());

    if (this.entry.collections.length) contentEl.createEl('div', { cls: 'pml-card-tags', text: `Collections: ${this.entry.collections.join(' · ')}` });
    if (this.entry.relations.length) {
      contentEl.createEl('h3', { text: 'Related works' });
      for (const relation of this.entry.relations) {
        const target = this.allEntries.find((item) => item.id === relation.targetId);
        contentEl.createEl('div', { text: `${relation.type}: ${target?.title ?? relation.targetId}` });
      }
    }

    if (this.settings.enablePlayers && this.entry.sources.length) {
      const sourceSection = contentEl.createDiv({ cls: 'pml-sources' });
      sourceSection.createEl('h3', { text: 'Sources' });
      for (const source of this.entry.sources) {
        const button = sourceSection.createEl('button', { text: source.label });
        button.type = 'button';
        button.addEventListener('click', () => this.mountPlayer(source));
      }
    }

    if (this.entry.pages.length) {
      const pageSection = contentEl.createDiv({ cls: 'pml-page-section' });
      pageSection.createEl('h3', { text: 'Pages' });
      const pageGrid = pageSection.createDiv({ cls: 'pml-page-grid' });
      for (const page of this.entry.pages) {
        const image = pageGrid.createEl('img', { cls: 'pml-page-thumb' });
        image.src = page.thumbnail ?? page.url;
        image.alt = page.alt ?? `Page ${page.page}`;
        image.loading = 'lazy';
        image.addEventListener('click', () => this.openPageViewer(page.page));
      }
    }

    if (this.entry.scenes.length) {
      const sceneSection = contentEl.createDiv({ cls: 'pml-scene-list' });
      sceneSection.createEl('h3', { text: 'Chapters and scenes' });
      for (const scene of this.entry.scenes) {
        const button = sceneSection.createEl('button', { cls: 'pml-scene-row' });
        button.type = 'button';
        button.createSpan({ text: formatTimecode(scene.startSeconds) });
        button.createSpan({ text: scene.title });
        button.addEventListener('click', () => {
          const source = this.entry.sources[0];
          if (source) this.mountPlayer(source, scene.startSeconds);
        });
      }
    }
  }

  private mountPlayer(source: MediaSource, startSeconds?: number): void {
    this.player?.destroy();
    const holder = this.contentEl.createDiv({ cls: 'pml-player-host' });
    const adjusted = startSeconds === undefined ? source : { ...source, startSeconds };
    const playback = this.entry.playback[source.id];
    this.player = new MediaPlayer(holder, adjusted, this.entry.scenes, (seconds) => { this.onSceneCapture(seconds); void this.onPersistScene?.(seconds); }, (position, duration, completed) => {
      void this.onPersistPlayback?.(source.id, position, duration, completed);
    }, playback?.positionSeconds);
  }

  override onClose(): void {
    this.player?.destroy();
    this.contentEl.empty();
  }

  private openPageViewer(pageNumber: number): void {
    const page = this.entry.pages.find((candidate) => candidate.page === pageNumber);
    if (!page) return;
    new PageViewerModal(this.app, page.url, page.alt ?? `Page ${page.page}`).open();
  }

}

class PageViewerModal extends Modal {
  constructor(
    app: import('obsidian').App,
    private readonly pageUrl: string,
    private readonly pageLabel: string,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass('pml-page-viewer');
    const image = this.contentEl.createEl('img', { cls: 'pml-page-large' });
    image.src = this.pageUrl;
    image.alt = this.pageLabel;
    image.loading = 'eager';
    this.contentEl.createEl('div', { cls: 'pml-page-counter', text: this.pageLabel });
  }

  override onClose(): void {
    this.contentEl.empty();
  }
}
