import type { LangProgress } from '../types/progress';
import type { WordIndexEntry } from '../types/word';
import type { StudyItem, StudyMode } from '../types/study';
import { newCard, isDue, isOverdue, parseDate } from './sm2';

const MODES: StudyMode[] = ['recognition', 'recall'];

export function buildSession(
  allWords: WordIndexEntry[],
  progress: LangProgress | undefined,
  maxNewPerDay = 10
): StudyItem[] {
  const cards = progress?.cards ?? {};
  const overdue: StudyItem[] = [];
  const dueToday: StudyItem[] = [];
  const newItems: StudyItem[] = [];

  for (const entry of allWords) {
    for (const mode of MODES) {
      const key = `${entry.word}::${mode}`;
      const card = cards[key];

      if (!card) {
        newItems.push({ word: entry.word, mode, cardKey: key, isNew: true });
      } else if (isOverdue(card)) {
        overdue.push({ word: entry.word, mode, cardKey: key, isNew: false });
      } else if (isDue(card)) {
        dueToday.push({ word: entry.word, mode, cardKey: key, isNew: false });
      }
    }
  }

  // Count words already introduced today to enforce per-day cap
  const todayStr = new Date().toISOString().split('T')[0];
  const wordsIntroducedToday = new Set<string>();
  for (const [key, card] of Object.entries(cards)) {
    if (parseDate(card.created).toISOString().split('T')[0] === todayStr) {
      wordsIntroducedToday.add(key.split('::')[0]);
    }
  }
  const remainingNew = Math.max(0, maxNewPerDay - wordsIntroducedToday.size);

  // Shuffle new words so every session samples different words, not always the first N
  const newWords = [...new Set(newItems.map((i) => i.word))];
  for (let i = newWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newWords[i], newWords[j]] = [newWords[j], newWords[i]];
  }
  const pickedWords = new Set(newWords.slice(0, remainingNew));
  const cappedNew = newItems.filter((i) => pickedWords.has(i.word));

  const session = [...overdue, ...dueToday, ...cappedNew];
  for (let i = session.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [session[i], session[j]] = [session[j], session[i]];
  }
  return session;
}

export function ensureCards(
  progress: LangProgress | undefined,
  items: StudyItem[]
): LangProgress {
  const existing = progress ?? {
    cards: {},
    stats: { streak_days: 0, last_study_date: null, total_reviews: 0, total_correct: 0 },
  };
  const cards = { ...existing.cards };
  for (const item of items) {
    if (!cards[item.cardKey]) {
      cards[item.cardKey] = newCard();
    }
  }
  return { ...existing, cards };
}
