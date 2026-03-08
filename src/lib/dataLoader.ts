import type { WordEntry, WordIndex } from '../types/word';

const wordCache = new Map<string, WordEntry>();
let indexCache: WordIndex | null = null;

export async function loadIndex(lang: string): Promise<WordIndex> {
  if (indexCache && indexCache.lang === lang) return indexCache;
  const res = await fetch(`/data/${lang}/_index.json`);
  if (!res.ok) throw new Error(`Failed to load index for ${lang}`);
  indexCache = await res.json();
  return indexCache!;
}

export async function loadWord(lang: string, word: string): Promise<WordEntry> {
  const cacheKey = `${lang}::${word}`;
  if (wordCache.has(cacheKey)) return wordCache.get(cacheKey)!;
  const res = await fetch(`/data/${lang}/${word}.json`);
  if (!res.ok) throw new Error(`Failed to load word: ${word}`);
  const entry: WordEntry = await res.json();
  wordCache.set(cacheKey, entry);
  return entry;
}

export async function preloadWords(lang: string, words: string[]): Promise<void> {
  await Promise.allSettled(words.map((w) => loadWord(lang, w)));
}

export function clearCache(): void {
  wordCache.clear();
  indexCache = null;
}
