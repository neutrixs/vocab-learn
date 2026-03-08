import type { ProgressStore } from '../types/progress';

const STORAGE_KEY = 'vocab_progress_v1';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function emptyStore(): ProgressStore {
  return { version: 1, languages: {} };
}

export function loadProgress(): ProgressStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    return JSON.parse(raw) as ProgressStore;
  } catch {
    return emptyStore();
  }
}

export function saveProgress(store: ProgressStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function updateStreak(store: ProgressStore, lang: string): ProgressStore {
  const lp = store.languages[lang];
  if (!lp) return store;
  const t = today();
  const last = lp.stats.last_study_date;
  let streak = lp.stats.streak_days;

  if (last === null) {
    streak = 1;
  } else {
    const yesterday = new Date(t);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    if (last === yStr) {
      streak += 1;
    } else if (last !== t) {
      streak = 1;
    }
  }

  return {
    ...store,
    languages: {
      ...store.languages,
      [lang]: {
        ...lp,
        stats: { ...lp.stats, streak_days: streak, last_study_date: t },
      },
    },
  };
}
