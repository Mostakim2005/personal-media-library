export function normalizeUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    url.hash = url.hash || '';
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function hostname(value: string): string {
  try { return new URL(value).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

export function providerForHost(host: string, map: Record<string, string>): string | undefined {
  const normalized = host.replace(/^www\./, '').toLowerCase();
  for (const [provider, domains] of Object.entries(map)) {
    const list = domains.split(',').map((part) => part.trim()).filter(Boolean);
    if (list.some((domain) => normalized === domain || normalized.endsWith(`.${domain}`))) return provider;
  }
  return undefined;
}

export function parseTimestamp(value: string): number | undefined {
  const text = value.trim();
  if (!text) return undefined;
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const seconds = Number(text);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
  }
  const parts = text.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return undefined;
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes !== undefined && seconds !== undefined ? minutes * 60 + seconds : undefined;
  }
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours !== undefined && minutes !== undefined && seconds !== undefined
      ? hours * 3600 + minutes * 60 + seconds
      : undefined;
  }
  return undefined;
}

export function timestampFromUrl(value: string): number | undefined {
  try {
    const url = new URL(value);
    const candidates = [
      url.searchParams.get('t'),
      url.searchParams.get('start'),
      url.searchParams.get('startSeconds'),
      url.hash.match(/(?:^|[&#])t=(\d+(?:\.\d+)?)/)?.[1],
      url.hash.match(/(?:^|[&#])start=(\d+(?:\.\d+)?)/)?.[1],
    ].filter((candidate): candidate is string => Boolean(candidate));
    for (const candidate of candidates) {
      const seconds = parseTimestamp(candidate);
      if (seconds !== undefined) return seconds;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function withTimestamp(value: string, seconds: number): string {
  try {
    const url = new URL(value);
    const safe = String(Math.max(0, Math.floor(seconds)));
    const host = hostname(value);
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      url.hash = `t=${safe}s`;
    } else {
      url.searchParams.set('t', safe);
    }
    return url.toString();
  } catch {
    return value;
  }
}
