import { parseTimestamp } from './url';
import type { TimestampMarker } from './types';

export function extractTimestampMarkers(text: string): TimestampMarker[] {
  const results: TimestampMarker[] = [];
  const seen = new Set<number>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^[-*•\s]+/, '').trim();
    if (!line) continue;
    const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:[-–—|]|\s{2,})\s*(.+)$/);
    if (!match) continue;
    const timestamp = match[1];
    const title = match[2]?.trim();
    if (!timestamp) continue;
    const seconds = parseTimestamp(timestamp);
    if (seconds === undefined || !title || seen.has(seconds)) continue;
    seen.add(seconds);
    results.push({ startSeconds: seconds, title });
  }
  return results.sort((a, b) => a.startSeconds - b.startSeconds);
}
