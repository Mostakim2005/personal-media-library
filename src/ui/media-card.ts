import type { LibrarySettings, MediaEntry, MetadataField } from '../types';

function enabled(settings: LibrarySettings, field: MetadataField): boolean {
  return settings.fields[field];
}

function people(value: MediaEntry['authors']): string {
  return value.map((p) => p.name).filter(Boolean).join(', ');
}

function safeStatus(entry: MediaEntry): string {
  return entry.userStatus ? entry.userStatus.replace('-', ' ') : '';
}

export function renderMediaCard(
  parent: HTMLElement,
  entry: MediaEntry,
  settings: LibrarySettings,
  onOpen: () => void,
): void {
  const card = parent.createDiv({ cls: 'pml-card' });
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Open ${entry.translatedTitle || entry.title}`);

  const media = card.createDiv({ cls: 'pml-card-media' });

  if (enabled(settings, 'thumbnail') && entry.thumbnail) {
    const image = media.createEl('img', {
      cls: 'pml-card-image',
      attr: { alt: entry.title, loading: 'lazy', decoding: 'async' },
    });
    image.src = entry.thumbnail;
    image.addEventListener('error', () => {
      image.remove();
      media.addClass('pml-card-media-fallback');
    });
  } else {
    media.addClass('pml-card-media-fallback');
  }

  const mediaOverlay = media.createDiv({ cls: 'pml-card-overlay' });
  if (entry.favorite) {
    mediaOverlay.createSpan({ cls: 'pml-card-favorite', text: '★', attr: { 'aria-label': 'Favorite' } });
  }
  mediaOverlay.createSpan({ cls: 'pml-card-type', text: entry.mediaType });

  const body = card.createDiv({ cls: 'pml-card-body' });
  if (enabled(settings, 'title')) {
    body.createDiv({ cls: 'pml-card-title', text: entry.translatedTitle || entry.title });
  }

  if (entry.originalTitle && entry.originalTitle !== (entry.translatedTitle || entry.title) && settings.detailLevel !== 'minimal') {
    body.createDiv({ cls: 'pml-card-subtitle', text: entry.originalTitle });
  }

  const meta = body.createDiv({ cls: 'pml-card-meta' });
  const status = safeStatus(entry);
  if (status) meta.createSpan({ cls: `pml-status pml-status-${entry.userStatus}`, text: status });
  if (enabled(settings, 'year') && entry.year) meta.createSpan({ text: String(entry.year) });
  if (enabled(settings, 'rating') && entry.rating !== undefined) meta.createSpan({ text: `★ ${entry.rating.toFixed(1)}` });
  if (enabled(settings, 'score') && entry.score !== undefined) meta.createSpan({ text: `Score ${entry.score.toFixed(1)}` });

  const fields: Array<[MetadataField, string | undefined]> = [
    ['authors', people(entry.authors)],
    ['artists', people(entry.artists)],
    ['director', people(entry.director)],
    ['producer', people(entry.producer)],
    ['studio', entry.studio],
    ['network', entry.network],
  ];

  if (settings.detailLevel !== 'minimal') {
    for (const [field, value] of fields) {
      if (enabled(settings, field) && value) body.createDiv({ cls: 'pml-card-secondary', text: value });
    }
  }

  if (settings.detailLevel === 'professional' && enabled(settings, 'description') && entry.description) {
    body.createDiv({ cls: 'pml-card-description', text: entry.description });
  }

  const chips: Array<[MetadataField, string[]]> = [
    ['genres', entry.genres], ['tags', entry.tags], ['subtitles', entry.subtitles],
  ];
  if (settings.detailLevel !== 'minimal') {
    const chipHost = body.createDiv({ cls: 'pml-card-tags' });
    for (const [field, values] of chips) {
      if (!enabled(settings, field)) continue;
      for (const value of values.slice(0, 4)) {
        chipHost.createSpan({ text: value });
      }
    }
    if (!chipHost.children.length) chipHost.remove();
  }

  card.addEventListener('click', () => onOpen());
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  });
}
