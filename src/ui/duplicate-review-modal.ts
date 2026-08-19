import { Modal, Notice } from 'obsidian';
import type { DuplicateCandidate } from '../services/duplicate-detector';

export class DuplicateReviewModal extends Modal {
  constructor(
    app: import('obsidian').App,
    private readonly candidates: DuplicateCandidate[],
    private readonly onMerge: (primaryId: string, secondaryId: string) => Promise<void>,
  ) { super(app); }

  override onOpen(): void {
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Likely duplicate media' });
    if (!this.candidates.length) {
      contentEl.createEl('p', { text: 'No likely duplicates were detected.' });
      return;
    }

    for (const candidate of this.candidates.slice(0, 50)) {
      const row = contentEl.createDiv({ cls: 'pml-duplicate-row' });
      const info = row.createDiv({ cls: 'pml-duplicate-info' });
      info.createEl('strong', { text: `${candidate.left.title} ↔ ${candidate.right.title}` });
      info.createEl('div', { cls: 'mod-muted', text: `${Math.round(candidate.score * 100)}% match · ${candidate.reason}` });

      const actions = row.createDiv({ cls: 'pml-duplicate-actions' });
      const left = actions.createEl('button', { text: 'Keep left' });
      left.addEventListener('click', () => { void this.merge(candidate.left.id, candidate.right.id); });
      const right = actions.createEl('button', { text: 'Keep right' });
      right.addEventListener('click', () => { void this.merge(candidate.right.id, candidate.left.id); });
    }
  }

  private async merge(primaryId: string, secondaryId: string): Promise<void> {
    try {
      await this.onMerge(primaryId, secondaryId);
      new Notice('Media records merged.');
      this.close();
    } catch {
      new Notice('Could not merge the selected media records.');
    }
  }
}
