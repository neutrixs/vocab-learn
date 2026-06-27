import type { WordEntry, WordIndex } from '../types/word';
import type { TextEntry, TextsIndex, TopicsConfig } from '../types/text';

const wordCache = new Map<string, WordEntry>();
let indexCache: WordIndex | null = null;
const textCache = new Map<string, TextEntry>();
const textsIndexCache = new Map<string, TextsIndex>();
const topicsCache = new Map<string, TopicsConfig>();

export async function loadIndex(lang: string): Promise<WordIndex> {
  if (indexCache && indexCache.lang === lang) return indexCache;
  const res = await fetch(`/api/words/${lang}`);
  if (!res.ok) throw new Error(`Failed to load index for ${lang}`);
  indexCache = await res.json();
  return indexCache!;
}

export async function loadWord(lang: string, word: string): Promise<WordEntry> {
  const cacheKey = `${lang}::${word}`;
  if (wordCache.has(cacheKey)) return wordCache.get(cacheKey)!;
  const res = await fetch(`/api/words/${lang}/${word}`);
  if (!res.ok) throw new Error(`Failed to load word: ${word}`);
  const entry: WordEntry = await res.json();
  wordCache.set(cacheKey, entry);
  return entry;
}

export async function preloadWords(lang: string, words: string[]): Promise<void> {
  await Promise.allSettled(words.map((w) => loadWord(lang, w)));
}

export async function loadTextsIndex(lang: string): Promise<TextsIndex> {
  const cached = textsIndexCache.get(lang);
  if (cached) return cached;
  const res = await fetch(`/api/texts/${lang}`);
  if (!res.ok) throw new Error(`Failed to load texts index for ${lang}`);
  const idx: TextsIndex = await res.json();
  textsIndexCache.set(lang, idx);
  return idx;
}

export async function loadTopics(lang: string): Promise<TopicsConfig> {
  const cached = topicsCache.get(lang);
  if (cached) return cached;
  const res = await fetch(`/api/texts/${lang}/topics`);
  if (!res.ok) throw new Error(`Failed to load topics for ${lang}`);
  const cfg: TopicsConfig = await res.json();
  topicsCache.set(lang, cfg);
  return cfg;
}

export async function loadText(lang: string, id: string): Promise<TextEntry> {
  const cacheKey = `${lang}::${id}`;
  if (textCache.has(cacheKey)) return textCache.get(cacheKey)!;
  const res = await fetch(`/api/texts/${lang}/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Failed to load text: ${id}`);
  const entry: TextEntry = await res.json();
  textCache.set(cacheKey, entry);
  return entry;
}

export function clearCache(): void {
  wordCache.clear();
  indexCache = null;
  textCache.clear();
  textsIndexCache.clear();
  topicsCache.clear();
}
