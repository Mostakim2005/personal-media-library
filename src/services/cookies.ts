import type { App } from 'obsidian';

export type CookieProvider =
  | 'nhentai'
  | 'hentaifox'
  | 'missav'
  | 'myanimelist'
  | 'mydramalist'
  | 'imdb'
  | 'viki'
  | 'iqiyi'
  | 'youtube';

interface CookieRecord {
  cookie: string;
  updatedAt: number;
  expiresAt?: number;
}

const IDS: Record<CookieProvider, string> = {
  nhentai: 'personal-media-library-cookie-nhentai',
  hentaifox: 'personal-media-library-cookie-hentaifox',
  missav: 'personal-media-library-cookie-missav',
  myanimelist: 'personal-media-library-cookie-myanimelist',
  mydramalist: 'personal-media-library-cookie-mydramalist',
  imdb: 'personal-media-library-cookie-imdb',
  viki: 'personal-media-library-cookie-viki',
  iqiyi: 'personal-media-library-cookie-iqiyi',
  youtube: 'personal-media-library-cookie-youtube',
};

const DOMAIN_MAP: Array<[CookieProvider, string[]]> = [
  ['nhentai', ['nhentai.net']],
  ['hentaifox', ['hentaifox.com']],
  ['missav', ['missav.ws', 'missav.com']],
  ['myanimelist', ['myanimelist.net']],
  ['mydramalist', ['mydramalist.com']],
  ['imdb', ['imdb.com']],
  ['viki', ['viki.com']],
  ['iqiyi', ['iq.com', 'iqiyi.com']],
  ['youtube', ['youtube.com', 'youtu.be']],
];

function providerForHost(hostname: string): CookieProvider | undefined {
  const host = hostname.replace(/^www\./, '').toLowerCase();
  for (const [provider, domains] of DOMAIN_MAP) {
    if (domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) return provider;
  }
  return undefined;
}

export function sanitizeCookieHeader(value: string): string | undefined {
  const cookie = value.trim();
  if (!cookie || cookie.length > 32768 || /[\r\n]/.test(cookie)) return undefined;
  const parts = cookie.split(';').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return undefined;
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq <= 0) return undefined;
    const name = part.slice(0, eq).trim();
    const valuePart = part.slice(eq + 1).trim();
    if (!/^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/.test(name)) return undefined;
    if (/[;\r\n]/.test(valuePart)) return undefined;
    if (/^(path|domain|expires|max-age|secure|httponly|samesite)$/i.test(name)) return undefined;
  }
  return parts.join('; ');
}

export class CookieSessionManager {
  private readonly records = new Map<CookieProvider, CookieRecord>();

  constructor(private readonly app: App) {}

  async initialize(): Promise<void> {
    for (const provider of Object.keys(IDS) as CookieProvider[]) {
      const raw = this.app.secretStorage.getSecret(IDS[provider]);
      if (!raw) continue;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') continue;
        const record = parsed as Partial<CookieRecord>;
        if (typeof record.cookie !== 'string' || typeof record.updatedAt !== 'number') continue;
        if (record.expiresAt !== undefined && (!Number.isFinite(record.expiresAt) || Date.now() >= record.expiresAt)) {
          this.clear(provider);
          continue;
        }
        const sanitized = sanitizeCookieHeader(record.cookie);
        if (!sanitized) {
          this.clear(provider);
          continue;
        }
        this.records.set(provider, {
          cookie: sanitized,
          updatedAt: record.updatedAt,
          expiresAt: record.expiresAt,
        });
      } catch {
        this.clear(provider);
      }
    }
  }

  async set(provider: CookieProvider, value: string, expiryDays?: number): Promise<boolean> {
    const cookie = sanitizeCookieHeader(value);
    if (!cookie) return false;
    const record: CookieRecord = {
      cookie,
      updatedAt: Date.now(),
      expiresAt: expiryDays && expiryDays > 0 ? Date.now() + expiryDays * 86400000 : undefined,
    };
    this.records.set(provider, record);
    this.app.secretStorage.setSecret(IDS[provider], JSON.stringify(record));
    return true;
  }

  getForUrl(url: string): string | undefined {
    try {
      const provider = providerForHost(new URL(url).hostname);
      if (!provider) return undefined;
      const record = this.records.get(provider);
      if (!record) return undefined;
      if (record.expiresAt !== undefined && Date.now() >= record.expiresAt) {
        this.clear(provider);
        return undefined;
      }
      return record.cookie;
    } catch {
      return undefined;
    }
  }

  status(provider: CookieProvider): { configured: boolean; updatedAt?: number; expiresAt?: number } {
    const record = this.records.get(provider);
    return record ? {
      configured: true,
      updatedAt: record.updatedAt,
      expiresAt: record.expiresAt,
    } : { configured: false };
  }

  mask(provider: CookieProvider): string {
    const record = this.records.get(provider);
    if (!record) return 'Not configured';
    const parts = record.cookie.split('; ').map((part) => {
      const eq = part.indexOf('=');
      return eq > 0 ? `${part.slice(0, eq)}=••••••` : '••••••';
    });
    return parts.join('; ');
  }

  clear(provider: CookieProvider): void {
    this.records.delete(provider);
    this.app.secretStorage.setSecret(IDS[provider], '');
  }

  clearAll(): void {
    for (const provider of Object.keys(IDS) as CookieProvider[]) this.clear(provider);
  }
}
