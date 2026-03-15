import type { ProgressStore, SM2Card } from '../types/progress';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

/** Returns true if the value looks like a valid SM2Card (has all required fields). */
export function isValidCard(v: unknown): v is SM2Card {
  if (!v || typeof v !== 'object') return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.due === 'string' &&
    typeof c.created === 'string' &&
    typeof c.ease_factor === 'number' &&
    typeof c.interval === 'number' &&
    typeof c.repetitions === 'number'
  );
}

/** Filters out entries that aren't valid SM2Cards from a cards record. */
export function filterValidCards(cards: Record<string, unknown>): Record<string, SM2Card> {
  const result: Record<string, SM2Card> = {};
  for (const [key, value] of Object.entries(cards)) {
    if (isValidCard(value)) {
      result[key] = value;
    }
  }
  return result;
}

export function emptyStore(): ProgressStore {
  return { version: 1, languages: {} };
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
