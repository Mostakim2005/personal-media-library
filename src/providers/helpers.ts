import type { MediaPerson } from '../types';

export function text(node: Element | null): string | undefined {
  const value = node?.textContent?.replace(/\s+/g, ' ').trim();
  return value || undefined;
}

export function meta(document: Document, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const value = node?.getAttribute('content')?.trim() ?? text(node);
    if (value) return value;
  }
  return undefined;
}

export function attr(document: Document, selectors: string[], name: string): string | undefined {
  for (const selector of selectors) {
    const value = document.querySelector(selector)?.getAttribute(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

export function all(document: Document, selectors: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const selector of selectors) {
    for (const node of Array.from(document.querySelectorAll(selector))) {
      const value = text(node);
      if (value && !seen.has(value)) { seen.add(value); result.push(value); }
    }
  }
  return result;
}

export function labeled(document: Document, label: string): string | undefined {
  for (const row of Array.from(document.querySelectorAll('li, tr'))) {
    const value = text(row);
    if (value?.startsWith(`${label}:`)) return value.slice(label.length + 1).trim();
  }
  return undefined;
}

export function person(name: string, role?: string, url?: string): MediaPerson {
  return { name, role, url };
}


export function jsonLd(document: Document): unknown[] {
  const values: unknown[] = [];
  for (const node of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    const source = node.textContent?.trim();
    if (!source) continue;
    try {
      const parsed: unknown = JSON.parse(source);
      if (Array.isArray(parsed)) values.push(...parsed);
      else values.push(parsed);
    } catch {
      // Ignore malformed structured data.
    }
  }
  return values;
}

export function jsonObjectsFromScripts(document: Document, needle: RegExp, max = 12): unknown[] {
  const results: unknown[] = [];
  for (const node of Array.from(document.querySelectorAll('script'))) {
    const source = node.textContent ?? '';
    if (!needle.test(source)) continue;
    const matches = source.match(/\{[\s\S]{0,500000}\}/g) ?? [];
    for (const candidate of matches.slice(0, max)) {
      try {
        results.push(JSON.parse(candidate) as unknown);
      } catch {
        // Not every script fragment is valid standalone JSON.
      }
    }
    if (results.length >= max) break;
  }
  return results;
}

export function absoluteUrl(base: string, value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, base).href;
  } catch {
    return undefined;
  }
}

export function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))];
}
