import { Modal, Notice, Setting } from 'obsidian';
import type { MediaEntry, RelationshipType } from '../types';

const RELATIONS: Record<RelationshipType, string> = {
  'adaptation-of': 'Adaptation of',
  'adapted-into': 'Adapted into',
  'sequel-to': 'Sequel to',
  'prequel-to': 'Prequel to',
  'spin-off-of': 'Spin-off of',
  'remake-of': 'Remake of',
  'related-to': 'Related to',
  'same-universe': 'Same universe',
};

export class OrganizationModal extends Modal {
  private favorite = false;
  private status: NonNullable<MediaEntry['userStatus']> = 'unwatched';
  private collections = '';
  private relationType: RelationshipType = 'related-to';
  private relationTarget = '';

  constructor(
    app: import('obsidian').App,
    private readonly entry: MediaEntry,
    private readonly allEntries: MediaEntry[],
    private readonly onSave: (update: Partial<MediaEntry>) => Promise<void>,
  ) { super(app); }

  override onOpen(): void {
    this.favorite = this.entry.favorite;
    this.status = this.entry.userStatus ?? 'unwatched';
    this.collections = this.entry.collections.join(', ');
    this.contentEl.empty();
    this.contentEl.createEl('h2', { text: 'Organize media' });

    new Setting(this.contentEl)
      .setName('Favorite')
      .addToggle((toggle) => toggle.setValue(this.favorite).onChange((value) => { this.favorite = value; }));

    new Setting(this.contentEl)
      .setName('Status')
      .addDropdown((dropdown) => dropdown
        .addOptions({ unwatched: 'Unwatched', watching: 'Watching', completed: 'Completed', paused: 'Paused', dropped: 'Dropped' })
        .setValue(this.status)
        .onChange((value) => { this.status = value as NonNullable<MediaEntry['userStatus']>; }));

    new Setting(this.contentEl)
      .setName('Collections')
      .setDesc('Comma-separated collection names.')
      .addText((text) => text.setValue(this.collections).onChange((value) => { this.collections = value; }));

    new Setting(this.contentEl).setName('Relationship').setHeading();

    new Setting(this.contentEl)
      .setName('Type')
      .addDropdown((dropdown) => dropdown
        .addOptions(RELATIONS)
        .setValue(this.relationType)
        .onChange((value) => { this.relationType = value as RelationshipType; }));

    const targetOptions: Record<string, string> = { '': 'Select media' };
    for (const item of this.allEntries) {
      if (item.id !== this.entry.id) targetOptions[item.id] = `${item.title} (${item.mediaType})`;
    }
    new Setting(this.contentEl)
      .setName('Target')
      .addDropdown((dropdown) => dropdown
        .addOptions(targetOptions)
        .onChange((value) => { this.relationTarget = value; }));

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText('Save').setCta().onClick(() => { void this.save(); }))
      .addButton((button) => button.setButtonText('Cancel').onClick(() => this.close()));
  }

  private async save(): Promise<void> {
    const relations = [...this.entry.relations];
    if (this.relationTarget && !relations.some((relation) => relation.targetId === this.relationTarget && relation.type === this.relationType)) {
      relations.push({ targetId: this.relationTarget, type: this.relationType });
    }
    await this.onSave({
      favorite: this.favorite,
      userStatus: this.status,
      collections: [...new Set(this.collections.split(',').map((value) => value.trim()).filter(Boolean))],
      relations,
    });
    new Notice('Media organization updated.');
    this.close();
  }
}
