export function parseTimecode(value: string): number | null {
  const text = value.trim();
  if (!text) return null;

  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const seconds = Number(text);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
  }

  const parts = text.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;

  if (parts.length === 2) {
    const minutes = parts[0];
    const seconds = parts[1];
    if (minutes === undefined || seconds === undefined) return null;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const hours = parts[0];
    const minutes = parts[1];
    const seconds = parts[2];
    if (hours === undefined || minutes === undefined || seconds === undefined) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function timestampFromUrl(url: string): number | undefined {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const candidates = [
      parsed.searchParams.get('t'),
      parsed.searchParams.get('start'),
      parsed.searchParams.get('startSeconds'),
      parsed.hash.match(/(?:^|[&#])t=(\d+(?:\.\d+)?)/)?.[1],
      parsed.hash.match(/(?:^|[&#])start=(\d+(?:\.\d+)?)/)?.[1],
    ].filter((v): v is string => Boolean(v));

    for (const candidate of candidates) {
      const seconds = parseTimecode(candidate);
      if (seconds !== null) return seconds;
    }

    if (host === 'youtu.be') {
      const t = parsed.searchParams.get('t');
      const seconds = t ? parseTimecode(t) : null;
      if (seconds !== null) return seconds;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export function timeUrl(url: string, seconds: number): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
      parsed.searchParams.set('t', String(Math.max(0, Math.floor(seconds))));
      return parsed.toString();
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      parsed.hash = `t=${Math.max(0, Math.floor(seconds))}s`;
      return parsed.toString();
    }

    parsed.searchParams.set('t', String(Math.max(0, Math.floor(seconds))));
    return parsed.toString();
  } catch {
    return url;
  }
}
