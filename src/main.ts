import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings';
import type { LibrarySettings } from './types';
import { MediaRepository } from './services/repository';
import { MetadataService } from './services/metadata';
import { TranslationService } from './services/translation';
import { CookieSessionManager } from './services/cookies';
import { AddMediaModal } from './ui/add-media-modal';
import { MediaLibrarySettingTab } from './settings-tab';
import { MediaLibraryView, VIEW_TYPE_MEDIA_LIBRARY } from './ui/library-view';
import { findDuplicateCandidates, mergeEntries } from './services/duplicate-detector';
import { DuplicateReviewModal } from './ui/duplicate-review-modal';
import { buildDiagnostics } from './services/diagnostics';
import { DiagnosticsModal } from './ui/diagnostics-modal';

export default class PersonalMediaLibraryPlugin extends Plugin {
  settings: LibrarySettings = DEFAULT_SETTINGS;
  repository!: MediaRepository;
  metadata!: MetadataService;
  translation!: TranslationService;
  cookies!: CookieSessionManager;

  private initializing?: Promise<void>;

  override onload(): void {
    this.initializing = this.initialize();
    void this.initializing.catch((error: unknown) => {
      console.error('Personal Media Library failed to initialize', error);
      new Notice('Personal media library could not start. Check the developer console for details.');
    });
  }

  private async initialize(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
    this.repository = new MediaRepository(this.app.vault, this.app.fileManager, this.settings.libraryFolder);
    this.cookies = new CookieSessionManager(this.app);
    await this.cookies.initialize();
    this.metadata = new MetadataService(this.cookies);
    this.translation = new TranslationService();

    this.addSettingTab(new MediaLibrarySettingTab(this.app, this));

    this.registerView(VIEW_TYPE_MEDIA_LIBRARY, (leaf) =>
      new MediaLibraryView(
        leaf,
        this.repository,
        () => this.settings,
        () => this.openAddMedia(),
        async () => this.repository.ensureFolder(),
      ),
    );

    this.addCommand({
      id: 'open-media-library',
      name: 'Open media library',
      callback: () => { void this.activateView(); },
    });

    this.addCommand({
      id: 'add-media-entry',
      name: 'Add media entry from URL',
      callback: () => this.openAddMedia(),
    });

    this.addCommand({
      id: 'manage-provider-cookies',
      name: 'Manage provider cookies',
      callback: () => { void import('./ui/cookie-manager-modal').then(({ CookieManagerModal }) => new CookieManagerModal(this.app, this.cookies).open()); },
    });

    this.addCommand({
      id: 'create-scene-timestamp',
      name: 'Create scene timestamp in active note',
      editorCallback: (editor) => {
        const line = editor.getCursor().line;
        editor.replaceSelection(`- 00:00 — Scene description\n`);
        editor.setCursor({ line: line, ch: 0 });
      },
    });

    this.addCommand({
      id: 'library-diagnostics',
      name: 'Open library diagnostics',
      callback: () => { void this.openDiagnostics(); },
    });

    this.addCommand({
      id: 'clear-metadata-cache',
      name: 'Clear metadata cache',
      callback: () => { this.metadata.clearCache(); new Notice('Metadata cache cleared.'); },
    });

    this.addCommand({
      id: 'find-duplicate-media',
      name: 'Find likely duplicate media',
      callback: () => { void this.openDuplicateReview(); },
    });

    this.addRibbonIcon('library', 'Open media library', () => { void this.activateView(); });
  }

  override onunload(): void {
    this.metadata?.clearCache();
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_MEDIA_LIBRARY)[0];
    const leaf = existing ?? this.app.workspace.getRightLeaf(false);
    if (!leaf) {
      new Notice('Could not open the media library view.');
      return;
    }

    await leaf.setViewState({ type: VIEW_TYPE_MEDIA_LIBRARY, active: true });
    void this.app.workspace.revealLeaf(leaf);
  }


  private async openDiagnostics(): Promise<void> {
    const items = await this.repository.list();
    new DiagnosticsModal(this.app, buildDiagnostics(items.map((item) => item.entry))).open();
  }

  private async openDuplicateReview(): Promise<void> {
    const items = await this.repository.list();
    const candidates = findDuplicateCandidates(items.map((item) => item.entry));
    new DuplicateReviewModal(this.app, candidates, async (primaryId, secondaryId) => {
      const primary = items.find((item) => item.entry.id === primaryId);
      const secondary = items.find((item) => item.entry.id === secondaryId);
      if (!primary || !secondary) throw new Error('Media record not found');
      const merged = mergeEntries(primary.entry, secondary.entry);
      await this.repository.update(primary.file, () => merged);
      await this.repository.delete(secondary.file);
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_MEDIA_LIBRARY)) {
        const view = leaf.view;
        if (view instanceof MediaLibraryView) await view.render();
      }
    }).open();
  }

  private openAddMedia(): void {
    new AddMediaModal(
      this.app,
      (url) => this.metadata.fetch(url),
      (title) => this.settings.enableTitleTranslation && this.settings.translationMode === 'jisho'
        ? this.translation.suggestEnglish(title)
        : Promise.resolve(undefined),
      async (entry) => {
        await this.repository.create(entry);
        new Notice('Media entry created.');
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MEDIA_LIBRARY);
        for (const leaf of leaves) {
          const view = leaf.view;
          if (view instanceof MediaLibraryView) await view.render();
        }
      },
    ).open();
  }
}
