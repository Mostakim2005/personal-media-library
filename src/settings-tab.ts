import { PluginSettingTab, Setting } from 'obsidian';
import type PersonalMediaLibraryPlugin from './main';
import type { MetadataField } from './types';
import { ALL_METADATA_FIELDS, applyDetailPreset } from './settings';

const LABELS: Record<MetadataField, string> = {
  title: 'Title', originalTitle: 'Original title', translatedTitle: 'Translated title',
  thumbnail: 'Thumbnail', description: 'Description', authors: 'Authors / creators',
  artists: 'Artists', cast: 'Cast', characters: 'Characters', director: 'Directors',
  producer: 'Producers', studio: 'Studio', network: 'Network', genres: 'Genres',
  tags: 'Tags', parody: 'Parody / source work', language: 'Language', country: 'Country',
  year: 'Year', releaseDate: 'Release date', status: 'Status', duration: 'Duration',
  episodes: 'Episodes', chapters: 'Chapters', volumes: 'Volumes', rating: 'Rating',
  score: 'Score', sourceSite: 'Source site', episodeTitle: 'Episode title',
  subtitles: 'Subtitles',
};

export class MediaLibrarySettingTab extends PluginSettingTab {
  constructor(app: PluginSettingTab['app'], private readonly plugin: PersonalMediaLibraryPlugin) {
    super(app, plugin);
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName('Display profile').setHeading();

    new Setting(containerEl)
      .setName('Preset')
      .setDesc('Choose minimal, standard, or professional, or use custom to control every field.')
      .addDropdown((dropdown) => dropdown
        .addOptions({ minimal: 'Minimal', standard: 'Standard', professional: 'Professional', custom: 'Custom' })
        .setValue(this.plugin.settings.detailLevel)
        .onChange(async (value) => {
          if (value === 'minimal' || value === 'standard' || value === 'professional') {
            applyDetailPreset(this.plugin.settings, value);
          } else {
            this.plugin.settings.detailLevel = 'custom';
          }
          await this.plugin.saveSettings();
          this.display();
        }));

    new Setting(containerEl)
      .setName('View mode')
      .addDropdown((dropdown) => dropdown
        .addOptions({ grid: 'Grid', list: 'List' })
        .setValue(this.plugin.settings.viewMode)
        .onChange(async (value) => {
          this.plugin.settings.viewMode = value === 'list' ? 'list' : 'grid';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl).setName('Metadata fields').setHeading();
    for (const field of ALL_METADATA_FIELDS) {
      new Setting(containerEl)
        .setName(LABELS[field])
        .addToggle((toggle) => toggle
          .setValue(this.plugin.settings.fields[field])
          .onChange(async (value) => {
            this.plugin.settings.fields[field] = value;
            this.plugin.settings.detailLevel = 'custom';
            await this.plugin.saveSettings();
          }));
    }


    new Setting(containerEl)
      .setName('Provider sessions')
      .setDesc('Store your own provider session cookies securely for normal authenticated requests.')
      .addButton((button) => button
        .setButtonText('Manage sessions')
        .onClick(() => {
          void import('./ui/cookie-manager-modal').then(({ CookieManagerModal }) => new CookieManagerModal(this.app, this.plugin.cookies).open());
        }));

    new Setting(containerEl).setName('Features').setHeading();
    const feature = (name: string, key: 'enablePlayers' | 'enableSceneCapture' | 'enableAutoMetadata' | 'enableTitleTranslation'): void => {
      new Setting(containerEl).setName(name).addToggle((toggle) => toggle
        .setValue(this.plugin.settings[key])
        .onChange(async (value) => { this.plugin.settings[key] = value; await this.plugin.saveSettings(); }));
    };
    feature('Enable players', 'enablePlayers');
    feature('Enable scene capture', 'enableSceneCapture');
    feature('Automatic metadata', 'enableAutoMetadata');
    feature('Automatic title translation', 'enableTitleTranslation');


    new Setting(containerEl)
      .setName('Dashboard')
      .setDesc('Show library statistics above the media grid or list.')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.dashboardVisible)
        .onChange(async (value) => { this.plugin.settings.dashboardVisible = value; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName('Duplicate detection')
      .setDesc('Allow the plugin to find likely duplicate media records.')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.enableDuplicateDetection)
        .onChange(async (value) => { this.plugin.settings.enableDuplicateDetection = value; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName('Library').setHeading();
    new Setting(containerEl)
      .setName('Library folder')
      .setDesc('Markdown files created by this plugin are stored here.')
      .addText((text) => text
        .setValue(this.plugin.settings.libraryFolder)
        .onChange(async (value) => {
          this.plugin.settings.libraryFolder = value.trim() || 'Media Library';
          await this.plugin.saveSettings();
        }));
  }
}
