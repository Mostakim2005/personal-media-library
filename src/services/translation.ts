import { requestUrl } from 'obsidian';

interface JishoEntry {
  japanese?: Array<{ word?: string; reading?: string }>;
  senses?: Array<{ english_definitions?: string[] }>;
}

interface JishoResponse {
  data?: JishoEntry[];
}

function looksJapanese(value: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
}

export class TranslationService {
  async suggestEnglish(title: string): Promise<string | undefined> {
    const query = title.trim();
    if (!query || !this.shouldQuery(query)) return undefined;

    try {
      const response = await requestUrl({
        url: `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(query)}`,
        method: 'GET',
        throw: false,
      });

      const json = JSON.parse(response.text) as JishoResponse;
      const best = json.data?.[0];
      const definition = best?.senses?.[0]?.english_definitions?.[0]?.trim();
      return definition || undefined;
    } catch {
      return undefined;
    }
  }

  private shouldQuery(value: string): boolean {
    if (looksJapanese(value)) return true;
    return /^[A-Za-z0-9\s'!?,.-]+$/.test(value) && value.split(/\s+/).length <= 10;
  }
}
