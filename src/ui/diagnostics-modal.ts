import { Modal } from 'obsidian';
import type { App } from 'obsidian';
import type { LibraryDiagnostics } from '../services/diagnostics';

export class DiagnosticsModal extends Modal {
  constructor(app: App, private readonly diagnostics: LibraryDiagnostics) {
    super(app);
  }

  override onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass('pml-diagnostics');
    this.contentEl.createEl('h2', { text: 'Library diagnostics' });
    const rows: Array<[string, string]> = [
      ['Total items', String(this.diagnostics.total)],
      ['Invalid items', String(this.diagnostics.invalid)],
      ['Items with sources', String(this.diagnostics.withSources)],
      ['Items with playback state', String(this.diagnostics.withPlayback)],
      ['Items with scenes', String(this.diagnostics.withScenes)],
      ['Schema versions', Object.entries(this.diagnostics.schemaVersions).map(([version, count]) => `${version}: ${count}`).join(', ') || 'None'],
    ];
    for (const [label, value] of rows) {
      const row = this.contentEl.createDiv({ cls: 'pml-diagnostic-row' });
      row.createSpan({ cls: 'pml-diagnostic-label', text: label });
      row.createSpan({ text: value });
    }
  }
}
