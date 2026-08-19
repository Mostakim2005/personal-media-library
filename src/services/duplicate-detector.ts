import type { MediaEntry } from '../types';

function normalize(value: string | undefined): string {
  return (value ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, ' ').trim();
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const sa = new Set(a.split(/\s+/));
  const sb = new Set(b.split(/\s+/));
  const intersection = [...sa].filter((token) => sb.has(token)).length;
  const union = new Set([...sa, ...sb]).size;
  return union ? intersection / union : 0;
}

export interface DuplicateCandidate {
  left: MediaEntry;
  right: MediaEntry;
  score: number;
  reason: string;
}

export function findDuplicateCandidates(entries: MediaEntry[], minimum = 0.72): DuplicateCandidate[] {
  const result: DuplicateCandidate[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i];
      const right = entries[j];
      if (!left || !right) continue;
      const titleScore = similarity(normalize(left.title), normalize(right.title));
      const originalScore = similarity(normalize(left.originalTitle), normalize(right.originalTitle));
      const urlOverlap = left.sources.some((a) => right.sources.some((b) => {
        try {
          return new URL(a.url).hostname === new URL(b.url).hostname;
        } catch {
          return false;
        }
      }));
      const score = Math.max(titleScore, originalScore * 0.95) + (urlOverlap ? 0.05 : 0);
      if (score >= minimum) {
        result.push({
          left,
          right,
          score: Math.min(1, score),
          reason: urlOverlap ? 'similar title and matching source domain' : originalScore > titleScore ? 'matching original title' : 'similar title',
        });
      }
    }
  }
  return result.sort((a, b) => b.score - a.score);
}

export function mergeEntries(primary: MediaEntry, secondary: MediaEntry): MediaEntry {
  const mergePeople = (a: MediaEntry['authors'], b: MediaEntry['authors']) => {
    const map = new Map<string, MediaEntry['authors'][number]>();
    for (const person of [...a, ...b]) map.set(person.name.toLowerCase(), person);
    return [...map.values()];
  };
  const mergeStrings = (a: string[], b: string[]) => [...new Set([...a, ...b])];

  return {
    ...primary,
    originalTitle: primary.originalTitle ?? secondary.originalTitle,
    translatedTitle: primary.translatedTitle ?? secondary.translatedTitle,
    thumbnail: primary.thumbnail ?? secondary.thumbnail,
    description: primary.description ?? secondary.description,
    authors: mergePeople(primary.authors, secondary.authors),
    artists: mergePeople(primary.artists, secondary.artists),
    cast: mergePeople(primary.cast, secondary.cast),
    characters: mergePeople(primary.characters, secondary.characters),
    director: mergePeople(primary.director, secondary.director),
    producer: mergePeople(primary.producer, secondary.producer),
    genres: mergeStrings(primary.genres, secondary.genres),
    tags: mergeStrings(primary.tags, secondary.tags),
    parody: mergeStrings(primary.parody, secondary.parody),
    collections: mergeStrings(primary.collections, secondary.collections),
    sources: [...new Map([...primary.sources, ...secondary.sources].map((source) => [source.url, source])).values()],
    scenes: [...primary.scenes, ...secondary.scenes.filter((scene) => !primary.scenes.some((existing) => existing.startSeconds === scene.startSeconds && existing.title === scene.title))],
    pageMarkers: [...primary.pageMarkers, ...secondary.pageMarkers.filter((marker) => !primary.pageMarkers.some((existing) => existing.page === marker.page && existing.title === marker.title))],
    pages: primary.pages.length ? primary.pages : secondary.pages,
    relations: [...primary.relations, ...secondary.relations.filter((relation) => !primary.relations.some((existing) => existing.targetId === relation.targetId && existing.type === relation.type))],
    provenance: [...primary.provenance, ...secondary.provenance],
    playback: { ...secondary.playback, ...primary.playback },
    favorite: primary.favorite || secondary.favorite,
    userStatus: primary.userStatus !== 'unwatched' ? primary.userStatus : secondary.userStatus,
    updatedAt: Date.now(),
  };
}
