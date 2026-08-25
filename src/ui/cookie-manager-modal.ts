import { App, Modal, Notice, Setting } from 'obsidian';
import type { CookieProvider, CookieSessionManager } from '../services/cookies';

const PROVIDERS: Array<[CookieProvider, string]> = [
  ['nhentai', 'nhentai'],
  ['hentaifox', 'HentaiFox'],
  ['missav', 'MissAV'],
  ['myanimelist', 'MyAnimeList'],
  ['mydramalist', 'MyDramaList'],
  ['imdb', 'IMDb'],
  ['viki', 'Viki'],
  ['iqiyi', 'iQIYI'],
  ['youtube', 'YouTube'],
];

export class CookieManagerModal extends Modal {
  constructor(
    app: App,
    private readonly manager: CookieSessionManager,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Provider sessions' });
    contentEl.createEl('p', {
      cls: 'mod-muted',
      text: 'Store your own session cookies securely. They are used only for normal authenticated requests to the matching provider and are never written to data.json.',
    });

    for (const [provider, label] of PROVIDERS) {
      const status = this.manager.status(provider);
      new Setting(contentEl)
        .setName(label)
        .setDesc(status.configured ? this.manager.mask(provider) : 'Not configured')
        .addButton((button) => button
          .setButtonText(status.configured ? 'Replace' : 'Add')
          .onClick(() => this.openEditor(provider, label)));

      if (status.configured) {
        new Setting(contentEl)
          .setName(`${label} session`)
          .setDesc(status.expiresAt ? `Local expiry: ${new Date(status.expiresAt).toLocaleDateString()}` : 'No local expiry')
          .addButton((button) => button
            .setButtonText('Clear')
            .onClick(() => {
              this.manager.clear(provider);
              new Notice(`${label} session cleared.`);
              this.render();
            }));
      }
    }

    new Setting(contentEl)
      .setName('Security boundary')
      .setDesc('The plugin does not import browser cookie databases or attempt to bypass captcha, bot challenges, paywalls, or access controls.');
  }

  private openEditor(provider: CookieProvider, label: string): void {
    const modal = new CookieEditorModal(this.app, label, async (value, days) => {
      const ok = await this.manager.set(provider, value, days);
      if (!ok) {
        new Notice('Invalid cookie header. Use only name=value pairs separated by semicolons.');
        return;
      }
      new Notice(`${label} session saved.`);
      this.render();
    });
    modal.open();
  }
}

class CookieEditorModal extends Modal {
  private value = '';
  private days = 90;

  constructor(
    app: App,
    private readonly label: string,
    private readonly onSave: (value: string, days: number) => Promise<void>,
  ) {
    super(app);
  }

  override onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: `Save ${this.label} session` });
    new Setting(contentEl)
      .setName('Cookie header')
      .setDesc('Paste a normal cookie header value such as sid=...; Token=.... Treat session cookies like passwords.')
      .addText((text) => text
        .setPlaceholder('Name=value; name2=value2')
        .onChange((value) => { this.value = value; }));

    new Setting(contentEl)
      .setName('Local expiry')
      .addDropdown((dropdown) => dropdown
        .addOptions({ '30': '30 days', '90': '90 days', '180': '180 days', '365': '1 year', '0': 'No local expiry' })
        .setValue('90')
        .onChange((value) => { this.days = Number(value); }));

    new Setting(contentEl)
      .addButton((button) => button
        .setButtonText('Save')
        .setCta()
        .onClick(() => { void this.save(); }))
      .addButton((button) => button
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  private async save(): Promise<void> {
    if (!this.value.trim()) {
      new Notice('Enter a cookie header first.');
      return;
    }
    await this.onSave(this.value, this.days);
    this.close();
  }
}
