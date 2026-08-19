import type { MetadataResult } from '../types';

export interface ProviderContext {
  url: string;
  html: string;
  document: Document;
}

export interface MetadataProvider {
  id: string;
  displayName: string;
  matches(url: string): boolean;
  extract(context: ProviderContext): MetadataResult | undefined;
}

export function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}
