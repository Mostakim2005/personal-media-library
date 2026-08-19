import type { LibrarySettings, MediaEntry, MetadataField } from '../types';

function enabled(settings: LibrarySettings, field: MetadataField): boolean {
  return settings.fields[field];
}

function people(value: MediaEntry['authors']): string {
  return value.map((p) => p.name).filter(Boolean).join(', ');
}

export function renderMediaCard(parent: HTMLElement, entry: MediaEntry, settings: LibrarySettings, onOpen: () => void): void {
  const card = parent.createDiv({ cls: 'pml-card' });
  card.tabIndex = 0;
  card.addEventListener('click', onOpen);
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  });

  if (enabled(settings, 'thumbnail') && entry.thumbnail) {
    const image = card.createEl('img', { cls: 'pml-card-image' });
    image.src = entry.thumbnail;
    image.alt = entry.title;
    image.loading = 'lazy';
    image.addEventListener('error', () => image.remove());
  }

  if (entry.favorite) card.createDiv({ cls: 'pml-card-favorite', text: '★' });
  const body = card.createDiv({ cls: 'pml-card-body' });
  if (enabled(settings, 'title')) body.createEl('div', { cls: 'pml-card-title', text: entry.translatedTitle || entry.title });

  const meta = body.createDiv({ cls: 'pml-card-meta' });
  if (entry.userStatus) meta.createSpan({ text: entry.userStatus });
  meta.createSpan({ text: entry.mediaType });
  if (enabled(settings, 'year') && entry.year) meta.createSpan({ text: String(entry.year) });
  if (enabled(settings, 'rating') && entry.rating !== undefined) meta.createSpan({ text: `★ ${entry.rating.toFixed(1)}` });
  if (enabled(settings, 'score') && entry.score !== undefined) meta.createSpan({ text: `Score ${entry.score.toFixed(1)}` });

  const fields: Array<[MetadataField, string | undefined]> = [
    ['authors', people(entry.authors)],
    ['artists', people(entry.artists)],
    ['cast', people(entry.cast)],
    ['characters', people(entry.characters)],
    ['director', people(entry.director)],
    ['producer', people(entry.producer)],
    ['studio', entry.studio],
    ['network', entry.network],
  ];
  for (const [field, value] of fields) {
    if (enabled(settings, field) && value) body.createEl('div', { cls: 'pml-card-secondary', text: value });
  }

  if (enabled(settings, 'description') && entry.description) {
    body.createEl('div', { cls: 'pml-card-description', text: entry.description });
  }

  const chips: Array<[MetadataField, string[]]> = [
    ['genres', entry.genres], ['tags', entry.tags], ['parody', entry.parody], ['subtitles', entry.subtitles],
  ];
  for (const [field, values] of chips) {
    if (enabled(settings, field) && values.length) body.createEl('div', { cls: 'pml-card-tags', text: values.join(' · ') });
  }

  if (enabled(settings, 'sourceSite') && entry.sourceSite) {
    body.createEl('div', { cls: 'pml-card-source', text: entry.sourceSite });
  }
}
