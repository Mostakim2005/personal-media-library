import type { MetadataProvider, ProviderContext } from './types';
import type { MediaPage, MetadataResult, MediaPerson } from '../types';
import { meta, text, all, absoluteUrl, uniqueStrings } from './helpers';

function domain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}


function labeled(document: Document, labels: string[]): string[] {
  const values: string[] = [];
  for (const row of Array.from(document.querySelectorAll('tr, li, dt, dd, .tag, .tags, [class*="tag"]'))) {
    const value = text(row);
    if (!value) continue;
    for (const label of labels) {
      const match = value.match(new RegExp(`^${label}\\s*:?\\s*(.+)$`, 'i'));
      const captured = match?.[1];
      if (captured) values.push(captured);
    }
  }
  return uniqueStrings(values);
}

function galleryImages(url: string, document: Document, host: string): MediaPage[] {
  const selectors = host.includes('nhentai')
    ? ['.gallerythumb img', '.thumb-container img', '#thumbnail-container img', 'img.lazyload']
    : ['.gallery img', '.thumb img', 'img[src*="thumbnail"]', 'img[data-src]'];
  const urls: string[] = [];
  for (const selector of selectors) {
    for (const img of Array.from(document.querySelectorAll(selector))) {
      const candidate = img.getAttribute('data-src') ?? img.getAttribute('data-original') ?? img.getAttribute('src');
      const absolute = absoluteUrl(url, candidate);
      if (absolute) urls.push(absolute);
    }
  }
  return uniqueStrings(urls).map((imageUrl, index) => ({
    page: index + 1,
    url: imageUrl,
    thumbnail: imageUrl,
    alt: undefined,
  }));
}

export class DoujinProvider implements MetadataProvider {
  id = 'doujin';
  displayName = 'Doujin and manga sites';

  matches(url: string): boolean {
    const host = domain(url);
    return host.endsWith('hentaifox.com') || host.endsWith('nhentai.net');
  }

  extract({ url, document }: ProviderContext): MetadataResult | undefined {
    const host = domain(url);
    const title = meta(document, ['meta[property="og:title"]', 'meta[name="twitter:title"]', 'title']);
    if (!title) return undefined;

    const description = meta(document, [
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ]);
    const thumbnail = meta(document, ['meta[property="og:image"]', 'meta[name="twitter:image"]']);

    const tagValues = uniqueStrings([
      ...all(document, ['.tags a', '.tag a', 'a[href*="/tag/"]', 'a[href*="/tags/"]']),
      ...labeled(document, ['Tags?', 'Categories?']),
    ]);

    const characterValues = uniqueStrings([
      ...all(document, ['a[href*="/character/"]', 'a[href*="/characters/"]']),
      ...labeled(document, ['Characters?']),
    ]);

    const parodyValues = uniqueStrings([
      ...all(document, ['a[href*="/parody/"]', 'a[href*="/parodies/"]']),
      ...labeled(document, ['Parodies?']),
    ]);

    const artistValues = uniqueStrings([
      ...all(document, ['a[href*="/artist/"]', 'a[href*="/artists/"]']),
      ...labeled(document, ['Artists?', 'Author']),
    ]);

    const groupValues = uniqueStrings([
      ...all(document, ['a[href*="/group/"]', 'a[href*="/groups/"]']),
      ...labeled(document, ['Groups?']),
    ]);

    const languages = uniqueStrings([
      ...all(document, ['a[href*="/language/"]', 'a[href*="/languages/"]']),
      ...labeled(document, ['Language', 'Languages']),
    ]);

    const categories = uniqueStrings([
      ...all(document, ['a[href*="/category/"]', 'a[href*="/categories/"]']),
      ...labeled(document, ['Category', 'Categories']),
    ]);

    const pageText = labeled(document, ['Pages', 'Page count']).join(' ');
    const pageCount = pageText.match(/\d+/)?.[0];

    const artists: MediaPerson[] = artistValues.map((name) => ({ name, role: 'artist' }));
    const groups: MediaPerson[] = groupValues.map((name) => ({ name, role: 'group' }));

    const pages = galleryImages(url, document, host);

    return {
      url,
      provider: this.id,
      title,
      originalTitle: title,
      description,
      thumbnail: thumbnail ?? pages[0]?.thumbnail,
      images: pages.map((page) => page.url),
      authors: [...artists, ...groups],
      artists,
      characters: characterValues.map((name) => ({ name, role: 'character' })),
      genres: categories,
      tags: tagValues,
      parody: parodyValues,
      language: languages[0],
      chapters: pageCount ? Number(pageCount) : pages.length || undefined,
      pages,
      mediaType: 'doujin',
      sourceSite: host,
    };
  }
}
