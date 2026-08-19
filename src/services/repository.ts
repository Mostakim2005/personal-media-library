import { TFile, TFolder, Vault } from 'obsidian';
import type { MediaEntry } from '../types';
import { makeId } from '../utils/id';
import { CURRENT_SCHEMA_VERSION, migrateMediaEntry } from './migrations';

const ENTRY_MARKER = 'media-entry';

function sanitizeFileName(title: string): string {
  return title.replace(/[\\/:*?"<>|#^[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'Untitled media';
}

function encodeEntry(entry: MediaEntry): string {
  return `~~~${ENTRY_MARKER}\n${JSON.stringify(entry)}\n~~~\n`;
}

function decodeEntry(content: string): MediaEntry | undefined {
  const match = content.match(new RegExp(`~~~${ENTRY_MARKER}\\n([\\s\\S]*?)\\n~~~`));
  if (!match) return undefined;
  try {
    return migrateMediaEntry(JSON.parse(match[1] ?? ''));
  } catch {
    return undefined;
  }
}

export class MediaRepository {
  constructor(private readonly vault: Vault, private readonly folder: string) {}

  async ensureFolder(): Promise<void> {
    const existing = this.vault.getAbstractFileByPath(this.folder);
    if (existing instanceof TFolder) return;
    if (!existing) await this.vault.createFolder(this.folder);
  }

  async list(): Promise<Array<{ file: TFile; entry: MediaEntry }>> {
    const folder = this.vault.getAbstractFileByPath(this.folder);
    if (!(folder instanceof TFolder)) return [];

    return this.listDeterministic(folder);
  }

  async create(entry: Omit<MediaEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>): Promise<TFile> {
    await this.ensureFolder();
    const now = Date.now();
    const complete: MediaEntry = {
      ...entry,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      authors: entry.authors ?? [],
      artists: entry.artists ?? [],
      cast: entry.cast ?? [],
      characters: entry.characters ?? [],
      director: entry.director ?? [],
      producer: entry.producer ?? [],
      genres: entry.genres ?? [],
      tags: entry.tags ?? [],
      parody: entry.parody ?? [],
      subtitles: entry.subtitles ?? [],
      sources: entry.sources ?? [],
      scenes: entry.scenes ?? [],
      pageMarkers: entry.pageMarkers ?? [],
      pages: entry.pages ?? [],
      playback: entry.playback ?? {},
      id: makeId(),
      createdAt: now,
      updatedAt: now,
    };
    const path = `${this.folder}/${sanitizeFileName(complete.title)}.md`;
    const uniquePath = await this.uniquePath(path);
    return this.vault.create(uniquePath, `# ${complete.title}\n\n${encodeEntry(complete)}`);
  }

  async update(file: TFile, updater: (entry: MediaEntry) => MediaEntry): Promise<void> {
    await this.vault.process(file, (content) => {
      const current = decodeEntry(content);
      if (!current) return content;
      const next = { ...updater(current), updatedAt: Date.now() };
      return content.replace(/~~~media-entry\n[\s\S]*?\n~~~/, encodeEntry(next).trim());
    });
  }

  async read(file: TFile): Promise<MediaEntry | undefined> {
    return decodeEntry(await this.vault.cachedRead(file));
  }

  async delete(file: TFile): Promise<void> {
    await this.vault.delete(file);
  }

  private async uniquePath(path: string): Promise<string> {
    if (!this.vault.getAbstractFileByPath(path)) return path;
    const dot = path.lastIndexOf('.');
    const stem = dot >= 0 ? path.slice(0, dot) : path;
    const ext = dot >= 0 ? path.slice(dot) : '';
    for (let i = 2; i < 1000; i += 1) {
      const candidate = `${stem} (${i})${ext}`;
      if (!this.vault.getAbstractFileByPath(candidate)) return candidate;
    }
    return `${stem}-${Date.now()}${ext}`;
  }
}
