import { ItemView, WorkspaceLeaf, Notice, TFile, debounce } from 'obsidian';
import type { LibrarySettings, MediaEntry } from '../types';
import { MediaRepository } from '../services/repository';
import { renderMediaCard } from './media-card';
import { MediaDetailModal } from './media-detail-view';
import { formatTimecode } from '../utils/time';
import { buildAnalytics } from '../services/library-analytics';

export const VIEW_TYPE_MEDIA_LIBRARY = 'personal-media-library';

type SortMode = 'updated' | 'title' | 'rating' | 'year';

function normalizeStatus(value: MediaEntry['userStatus']): string {
  return value?.replace('-', ' ') ?? '';
}

export class MediaLibraryView extends ItemView {
  private items: Array<{ file: TFile; entry: MediaEntry }> = [];
  private settings!: LibrarySettings;
  private searchValue = '';
  private typeValue = '';
  private statusValue = '';
  private collectionValue = '';
  private favoriteOnly = false;
  private sortMode: SortMode = 'updated';

  constructor(
    leaf: WorkspaceLeaf,
    private readonly repository: MediaRepository,
    private readonly getSettings: () => LibrarySettings,
    private readonly onCreate: () => void,
    private readonly onRefresh: () => Promise<void>,
    private readonly onSaveSettings: () => Promise<void>,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_MEDIA_LIBRARY;
  }

  getDisplayText(): string {
    return 'Media library';
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
    this.items = [];
  }

  async render(): Promise<void> {
    this.settings = this.getSettings();
    this.contentEl.empty();
    this.contentEl.addClass('pml-library');

    const shell = this.contentEl.createDiv({ cls: 'pml-shell' });
    this.renderHeader(shell);

    try {
      this.items = await this.repository.list();
    } catch (error) {
      console.error('Personal Media Library: failed to read library', error);
      this.renderError(shell);
      return;
    }

    this.renderDashboard(shell);
    this.renderFilters(shell);
    this.renderResults(shell);
  }

  private renderHeader(parent: HTMLElement): void {
    const header = parent.createDiv({ cls: 'pml-header' });
    const heading = header.createDiv({ cls: 'pml-heading' });
    heading.createDiv({ cls: 'pml-eyebrow', text: 'PERSONAL MEDIA' });
    heading.createDiv({ cls: 'pml-title', text: 'Your library' });
    heading.createDiv({ cls: 'pml-caption', text: 'Find, organize, and continue your media.' });

    const actions = header.createDiv({ cls: 'pml-header-actions' });
    const add = actions.createEl('button', { cls: 'pml-primary-button', text: 'Add media' });
    add.type = 'button';
    add.addEventListener('click', this.onCreate);

    const refresh = actions.createEl('button', { cls: 'pml-icon-button', text: '↻', attr: { 'aria-label': 'Refresh library', title: 'Refresh' } });
    refresh.type = 'button';
    refresh.addEventListener('click', () => {
      refresh.toggleClass('is-loading', true);
      void this.onRefresh()
        .then(() => this.render())
        .catch((error: unknown) => {
          console.error('Personal Media Library: refresh failed', error);
          new Notice('Could not refresh the media library.');
        })
        .finally(() => refresh.toggleClass('is-loading', false));
    });
  }

  private renderDashboard(parent: HTMLElement): void {
    if (!this.settings.dashboardVisible) return;
    const entries = this.items.map((item) => item.entry);
    const analytics = buildAnalytics(entries);
    const dashboard = parent.createDiv({ cls: 'pml-stat-strip' });
    const stats = [
      [`${analytics.total}`, 'Items'],
      [`${analytics.favorites}`, 'Favorites'],
      [`${analytics.completed}`, 'Completed'],
      [analytics.averageRating !== undefined ? analytics.averageRating.toFixed(1) : '—', 'Avg. rating'],
    ];
    for (const [value, label] of stats) {
      const card = dashboard.createDiv({ cls: 'pml-stat' });
      card.createDiv({ cls: 'pml-stat-value', text: value });
      card.createDiv({ cls: 'pml-stat-label', text: label });
    }
  }

  private renderFilters(parent: HTMLElement): void {
    const panel = parent.createDiv({ cls: 'pml-search-panel' });
    const searchWrap = panel.createDiv({ cls: 'pml-search-wrap' });
    searchWrap.createSpan({ cls: 'pml-search-icon', text: '⌕' });
    const search = searchWrap.createEl('input', {
      cls: 'pml-search',
      attr: {
        type: 'search',
        placeholder: 'Search titles, people, tags…',
        'aria-label': 'Search media library',
      },
    });
    search.value = this.searchValue;
    search.addEventListener('input', debounce(() => {
      this.searchValue = search.value;
      this.renderResults();
    }, 120));

    const filters = panel.createDiv({ cls: 'pml-filter-row' });
    this.addSelect(filters, 'Type', [
      ['', 'All types'],
      ['anime', 'Anime'],
      ['manga', 'Manga'],
      ['doujin', 'Doujin'],
      ['movie', 'Movies'],
      ['tv-series', 'TV series'],
      ['live-action', 'Live action'],
      ['web-series', 'Web series'],
      ['video', 'Video'],
      ['other', 'Other'],
    ], this.typeValue, (value) => {
      this.typeValue = value;
      this.renderResults();
    });

    this.addSelect(filters, 'Status', [
      ['', 'All status'],
      ['unwatched', 'Unwatched'],
      ['watching', 'Watching'],
      ['completed', 'Completed'],
      ['paused', 'Paused'],
      ['dropped', 'Dropped'],
    ], this.statusValue, (value) => {
      this.statusValue = value;
      this.renderResults();
    });

    const collections = [...new Set(this.items.flatMap((item) => item.entry.collections))].sort();
    this.addSelect(filters, 'Collection', [
      ['', 'All collections'],
      ...collections.map((value) => [value, value] as [string, string]),
    ], this.collectionValue, (value) => {
      this.collectionValue = value;
      this.renderResults();
    });

    this.addSelect(filters, 'Sort', [
      ['updated', 'Recently updated'],
      ['title', 'Title'],
      ['rating', 'Rating'],
      ['year', 'Year'],
    ], this.sortMode, (value) => {
      this.sortMode = value as SortMode;
      this.renderResults();
    });

    const favorite = filters.createEl('button', {
      cls: this.favoriteOnly ? 'pml-filter-chip is-active' : 'pml-filter-chip',
      text: '★ Favorites',
      attr: { 'aria-pressed': String(this.favoriteOnly) },
    });
    favorite.type = 'button';
    favorite.addEventListener('click', () => {
      this.favoriteOnly = !this.favoriteOnly;
      favorite.toggleClass('is-active', this.favoriteOnly);
      favorite.setAttr('aria-pressed', String(this.favoriteOnly));
      this.renderResults();
    });
  }

  private addSelect(
    parent: HTMLElement,
    label: string,
    options: Array<[string, string]>,
    value: string,
    onChange: (value: string) => void,
  ): void {
    const wrap = parent.createDiv({ cls: 'pml-select-wrap' });
    const select = wrap.createEl('select', { attr: { 'aria-label': label } });
    for (const [optionValue, optionLabel] of options) {
      select.createEl('option', { value: optionValue, text: optionLabel });
    }
    select.value = value;
    select.addEventListener('change', () => onChange(select.value));
  }

  private renderResults(parent?: HTMLElement): void {
    const host = parent ?? this.contentEl.querySelector('.pml-results')?.parentElement;
    if (!host) return;

    let results = this.items.filter(({ entry }) => {
      if (this.typeValue && entry.mediaType !== this.typeValue) return false;
      if (this.statusValue && entry.userStatus !== this.statusValue) return false;
      if (this.collectionValue && !entry.collections.includes(this.collectionValue)) return false;
      if (this.favoriteOnly && !entry.favorite) return false;
      if (!this.searchValue.trim()) return true;

      const needle = this.searchValue.trim().toLowerCase();
      const haystack = [
        entry.title,
        entry.translatedTitle ?? '',
        entry.originalTitle ?? '',
        entry.description ?? '',
        entry.sourceSite ?? '',
        ...entry.tags,
        ...entry.genres,
        ...entry.authors.map((person) => person.name),
        ...entry.artists.map((person) => person.name),
      ].join(' ').toLowerCase();

      return haystack.includes(needle);
    });

    results = [...results].sort((a, b) => {
      switch (this.sortMode) {
        case 'title':
          return a.entry.title.localeCompare(b.entry.title);
        case 'rating':
          return (b.entry.rating ?? -1) - (a.entry.rating ?? -1);
        case 'year':
          return (b.entry.year ?? -1) - (a.entry.year ?? -1);
        default:
          return b.entry.updatedAt - a.entry.updatedAt;
      }
    });

    const existing = this.contentEl.querySelector('.pml-results-shell');
    if (existing) existing.remove();

    const shell = this.contentEl.createDiv({ cls: 'pml-results-shell' });
    const count = shell.createDiv({ cls: 'pml-results-heading' });
    count.createSpan({ text: `${results.length} ${results.length === 1 ? 'item' : 'items'}` });
    const viewToggle = count.createDiv({ cls: 'pml-view-toggle' });

    for (const [value, label] of [['grid', 'Grid'], ['list', 'List']] as const) {
      const button = viewToggle.createEl('button', {
        cls: this.settings.viewMode === value ? 'pml-view-button is-active' : 'pml-view-button',
        text: label,
      });
      button.type = 'button';
      button.addEventListener('click', () => {
        this.settings.viewMode = value;
        void this.saveViewPreference().catch((error: unknown) => {
          console.error('Personal Media Library: could not save view preference', error);
          new Notice('Could not save the view preference.');
        });
      });
    }

    if (!results.length) {
      const empty = shell.createDiv({ cls: 'pml-empty-state' });
      empty.createDiv({ cls: 'pml-empty-icon', text: '＋' });
      empty.createDiv({ cls: 'pml-empty-title', text: this.items.length ? 'Nothing matches those filters' : 'Your library is empty' });
      empty.createDiv({
        cls: 'pml-empty-text',
        text: this.items.length ? 'Try a different search or clear one of the filters.' : 'Add a media URL and we’ll build the record for you.',
      });
      if (!this.items.length) {
        const button = empty.createEl('button', { cls: 'pml-primary-button', text: 'Add your first item' });
        button.type = 'button';
        button.addEventListener('click', this.onCreate);
      }
      return;
    }

    const grid = shell.createDiv({ cls: this.settings.viewMode === 'grid' ? 'pml-grid' : 'pml-list' });
    const entries = this.items.map((item) => item.entry);

    for (const item of results) {
      renderMediaCard(grid, item.entry, this.settings, () => new MediaDetailModal(
        this.app,
        item.entry,
        this.settings,
        (seconds) => new Notice(`Captured timestamp: ${formatTimecode(seconds)}`),
        async (seconds) => {
          await this.repository.update(item.file, (current) => ({
            ...current,
            scenes: [
              ...current.scenes,
              {
                id: `scene-${Date.now().toString(36)}`,
                startSeconds: seconds,
                title: `Scene at ${formatTimecode(seconds)}`,
                tags: [],
                people: [],
              },
            ],
          }));
        },
        entries,
        async (update: Partial<MediaEntry>) => {
          await this.repository.update(item.file, (current) => ({ ...current, ...update }));
          await this.render();
        },
        async (sourceId, positionSeconds, durationSeconds, completed) => {
          await this.repository.update(item.file, (current) => ({
            ...current,
            playback: {
              ...current.playback,
              [sourceId]: {
                positionSeconds,
                durationSeconds,
                completed: completed === true || (
                  durationSeconds !== undefined &&
                  durationSeconds > 0 &&
                  positionSeconds / durationSeconds >= 0.9
                ),
                updatedAt: Date.now(),
              },
            },
          }));
        },
      ).open());
    }
  }

  private renderError(parent: HTMLElement): void {
    const error = parent.createDiv({ cls: 'pml-empty-state pml-empty-state-error' });
    error.createDiv({ cls: 'pml-empty-icon', text: '!' });
    error.createDiv({ cls: 'pml-empty-title', text: 'Could not read the media library' });
    error.createDiv({ cls: 'pml-empty-text', text: 'The plugin is running, but the library folder could not be read. Open settings to verify the library folder.' });
    const button = error.createEl('button', { cls: 'pml-primary-button', text: 'Try again' });
    button.type = 'button';
    button.addEventListener('click', () => { void this.render(); });
  }

  private async saveViewPreference(): Promise<void> {
    await this.onSaveSettings();
    await this.render();
  }
}
