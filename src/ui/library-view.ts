import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import type { LibrarySettings, MediaEntry } from '../types';
import { MediaRepository } from '../services/repository';
import { renderMediaCard } from './media-card';
import { MediaDetailModal } from './media-detail-view';
import { formatTimecode } from '../utils/time';
import { buildAnalytics } from '../services/library-analytics';

export const VIEW_TYPE_MEDIA_LIBRARY = 'personal-media-library';

export class MediaLibraryView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private readonly repository: MediaRepository,
    private readonly getSettings: () => LibrarySettings,
    private readonly onCreate: () => void,
    private readonly onRefresh: () => Promise<void>,
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
  }

  async render(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pml-library');

    const toolbar = contentEl.createDiv({ cls: 'pml-toolbar' });
    toolbar.createDiv({ cls: 'pml-view-heading', text: 'Media library', attr: { role: 'heading', 'aria-level': '2' } });
    const actions = toolbar.createDiv({ cls: 'pml-toolbar-actions' });

    const refresh = actions.createEl('button', { text: 'Refresh' });
    refresh.type = 'button';
    refresh.addEventListener('click', () => { void this.onRefresh().then(() => this.render()); });

    const add = actions.createEl('button', { text: 'Add media', cls: 'mod-cta' });
    add.type = 'button';
    add.addEventListener('click', this.onCreate);

    const items = await this.repository.list();
    const entries = items.map((item) => item.entry);
    const settings = this.getSettings();

    const analytics = buildAnalytics(entries);
    const dashboard = settings.dashboardVisible ? contentEl.createDiv({ cls: 'pml-dashboard' }) : undefined;
    if (dashboard) {
      dashboard.createEl('div', { cls: 'pml-dashboard-stat', text: `${analytics.total} items` });
      dashboard.createEl('div', { cls: 'pml-dashboard-stat', text: `${analytics.favorites} favorites` });
      dashboard.createEl('div', { cls: 'pml-dashboard-stat', text: `${analytics.completed} completed` });
      dashboard.createEl('div', { cls: 'pml-dashboard-stat', text: analytics.averageRating !== undefined ? `★ ${analytics.averageRating.toFixed(1)} avg` : 'No ratings' });
    }

    const filters = contentEl.createDiv({ cls: 'pml-filters' });
    const search = filters.createEl('input', {
      cls: 'pml-filter-search',
      attr: { type: 'search', placeholder: 'Search title, author, or tag…' },
    });
    const type = filters.createEl('select', { cls: 'pml-filter-type' });
    type.createEl('option', { text: 'All types', value: '' });
    const status = filters.createEl('select', { cls: 'pml-filter-type' });
    status.createEl('option', { text: 'All statuses', value: '' });
    for (const option of ['unwatched', 'watching', 'completed', 'paused', 'dropped']) status.createEl('option', { text: option, value: option });
    const collections = filters.createEl('select', { cls: 'pml-filter-type' });
    collections.createEl('option', { text: 'All collections', value: '' });
    for (const name of [...new Set(entries.flatMap((entry) => entry.collections))].sort()) collections.createEl('option', { text: name, value: name });
    const favorites = filters.createEl('select', { cls: 'pml-filter-type' });
    favorites.createEl('option', { text: 'All', value: '' });
    favorites.createEl('option', { text: 'Favorites', value: 'favorites' });

    for (const option of ['anime', 'manga', 'doujin', 'movie', 'tv-series', 'live-action', 'web-series', 'video', 'other']) {
      type.createEl('option', { text: option, value: option });
    }

    if (!items.length) {
      contentEl.createEl('div', { cls: 'pml-empty', text: 'No media entries yet. Add a URL to create your first entry.' });
      return;
    }

    const container = contentEl.createDiv({ cls: settings.viewMode === 'grid' ? 'pml-grid' : 'pml-list' });

    const renderFiltered = (): void => {
      container.empty();
      const needle = search.value.trim().toLowerCase();
      const selectedType = type.value;
      const filtered = items.filter(({ entry }) => {
        if (selectedType && entry.mediaType !== selectedType) return false;
        if (status.value && entry.userStatus !== status.value) return false;
        if (collections.value && !entry.collections.includes(collections.value)) return false;
        if (favorites.value === 'favorites' && !entry.favorite) return false;
        if (!needle) return true;
        const haystack = [
          entry.title,
          entry.translatedTitle ?? '',
          entry.originalTitle ?? '',
          entry.description ?? '',
          ...entry.tags,
          ...entry.genres,
          ...entry.authors.map((person) => person.name),
        ].join(' ').toLowerCase();
        return haystack.includes(needle);
      });

      for (const item of filtered) {
        renderMediaCard(container, item.entry, settings, () => new MediaDetailModal(
          this.app,
          item.entry,
          settings,
          (seconds) => {
            new Notice(`Captured timestamp: ${formatTimecode(seconds)}`);
          },
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
          },
          async (sourceId, positionSeconds, durationSeconds, completed) => {
            await this.repository.update(item.file, (current) => ({
              ...current,
              playback: {
                ...current.playback,
                [sourceId]: {
                  positionSeconds,
                  durationSeconds,
                  completed: completed === true || (durationSeconds !== undefined && durationSeconds > 0 && positionSeconds / durationSeconds >= 0.9),
                  updatedAt: Date.now(),
                },
              },
            }));
          },
        ).open());
      }

      if (!filtered.length) {
        container.createEl('div', { cls: 'pml-empty', text: 'No media matches the current filters.' });
      }
    };

    search.addEventListener('input', renderFiltered);
    type.addEventListener('change', renderFiltered);
    status.addEventListener('change', renderFiltered);
    favorites.addEventListener('change', renderFiltered);
    collections.addEventListener('change', renderFiltered);
    renderFiltered();
  }
}
