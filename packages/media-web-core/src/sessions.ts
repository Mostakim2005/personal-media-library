import type { App } from 'obsidian';
import { hostname, providerForHost } from './url';

export interface ProviderSessionConfig {
  [provider: string]: string;
}

export class ProviderSessionStore {
  constructor(
    private readonly app: App,
    private readonly secretNames: ProviderSessionConfig,
  ) {}

  getSecretName(provider: string): string | undefined {
    return this.secretNames[provider];
  }

  getCookieForUrl(url: string): string | undefined {
    const provider = providerForHost(hostname(url), this.secretNames);
    if (!provider) return undefined;
    const secretName = this.secretNames[provider];
    return secretName ? this.app.secretStorage.getSecret(secretName) || undefined : undefined;
  }

  setSecretName(provider: string, secretName: string): void {
    this.secretNames[provider] = secretName;
  }

  clearSecret(provider: string): void {
    const secretName = this.secretNames[provider];
    if (secretName) this.app.secretStorage.setSecret(secretName, '');
    delete this.secretNames[provider];
  }
}
