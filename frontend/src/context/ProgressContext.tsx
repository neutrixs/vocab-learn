import { createContext, useContext, useReducer, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { ProgressStore, SM2Card, LangProgress, LangStats } from '../types/progress';
import type { ReviewGrade } from '../types/study';
import { loadProgress, saveProgress } from '../lib/storage';
import { applyReview, newCard } from '../lib/sm2';
import { updateStreak } from '../lib/storage';
import { apiFetch } from '../lib/apiClient';
import { useLanguage } from './LanguageContext';

interface ProgressContextValue {
  store: ProgressStore;
  getLangProgress: (lang: string) => LangProgress | undefined;
  getCard: (lang: string, cardKey: string) => SM2Card;
  recordReview: (lang: string, cardKey: string, grade: ReviewGrade) => void;
  resetLang: (lang: string) => void;
  resetAll: () => void;
}

type Action =
  | { type: 'RECORD_REVIEW'; lang: string; cardKey: string; grade: ReviewGrade }
  | { type: 'RESET_LANG'; lang: string }
  | { type: 'RESET_ALL' }
  | { type: 'MERGE_SERVER'; lang: string; cards: Record<string, SM2Card>; stats: LangStats | null };

function reducer(store: ProgressStore, action: Action): ProgressStore {
  switch (action.type) {
    case 'RECORD_REVIEW': {
      const { lang, cardKey, grade } = action;
      const lp = store.languages[lang] ?? {
        cards: {},
        stats: { streak_days: 0, last_study_date: null, total_reviews: 0, total_correct: 0 },
      };
      const card = lp.cards[cardKey] ?? newCard();
      const updated = applyReview(card, grade);
      const newLp: LangProgress = {
        ...lp,
        cards: { ...lp.cards, [cardKey]: updated },
        stats: {
          ...lp.stats,
          total_reviews: lp.stats.total_reviews + 1,
          total_correct: lp.stats.total_correct + (grade === 'pass' ? 1 : 0),
        },
      };
      const withLang = {
        ...store,
        languages: { ...store.languages, [lang]: newLp },
      };
      return updateStreak(withLang, lang);
    }
    case 'RESET_LANG': {
      const { [action.lang]: _, ...rest } = store.languages;
      return { ...store, languages: rest };
    }
    case 'RESET_ALL':
      return { version: 1, languages: {} };
    case 'MERGE_SERVER': {
      const { lang, cards, stats: serverStats } = action;
      const lp = store.languages[lang];
      const defaultStats: LangStats = { streak_days: 0, last_study_date: null, total_reviews: 0, total_correct: 0 };

      // --- DB MIGRATION: remove in next version ---
      // The lang_stats table was added after cards already existed in the DB.
      // On first deploy, server returns stats: null for existing users because
      // no lang_stats row exists yet. We treat null as "uninitialized" — keep
      // whatever the local device has and don't let zeroed defaults overwrite it.
      // Once the first device with real stats syncs, the server will have a row
      // and future merges use the normal max-based strategy below.
      // After all clients have synced at least once, this null guard is redundant
      // because the server will always have a stats row.
      // --- end DB MIGRATION ---

      if (!lp) {
        return {
          ...store,
          languages: {
            ...store.languages,
            [lang]: {
              cards,
              // If server stats are uninitialized (null), start with zeroed defaults.
              // This is only reached on a fresh device with no localStorage — there's
              // nothing better to use. The real stats will arrive once the primary
              // device syncs.
              stats: serverStats ?? defaultStats,
            },
          },
        };
      }
      // Server cards fill in anything missing locally.
      const mergedCards = { ...cards, ...lp.cards };
      // TEMPORARY FIX
      // somehow, there's a cards entry inside cards entry, causing the app to fail.
      Object.keys(mergedCards).forEach(key => {
        const entry = mergedCards[key]
        if (!entry.created || !entry.due) {
            delete mergedCards[key]
        }
      })

      // Merge stats: if server stats are uninitialized (null), keep local as-is.
      // Otherwise take the higher counters; for streak use whichever is more recent.
      let mergedStats = lp.stats;
      if (serverStats) {
        const localDate = lp.stats.last_study_date ?? '';
        const serverDate = serverStats.last_study_date ?? '';
        mergedStats = {
          total_reviews: Math.max(lp.stats.total_reviews, serverStats.total_reviews),
          total_correct: Math.max(lp.stats.total_correct, serverStats.total_correct),
          streak_days: serverDate > localDate ? serverStats.streak_days : lp.stats.streak_days,
          last_study_date: serverDate > localDate ? serverStats.last_study_date : lp.stats.last_study_date,
        };
      }
      return {
        ...store,
        languages: { ...store.languages, [lang]: { ...lp, cards: mergedCards, stats: mergedStats } },
      };
    }
    default:
      return store;
  }
}

const ProgressContext = createContext<ProgressContextValue>({} as ProgressContextValue);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(reducer, undefined, loadProgress);
  const { lang } = useLanguage();
  const flushTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Track dirty cards in a ref so it's never stale.
  const dirtyRef = useRef(new Map<string, Map<string, SM2Card>>());

  const flushDirty = useCallback(async () => {
    for (const [l, cards] of dirtyRef.current) {
      if (cards.size === 0) continue;
      const payload: Record<string, SM2Card> = {};
      for (const [k, v] of cards) payload[k] = v;
      // Include current stats so they stay in sync with card updates.
      // --- DB MIGRATION: remove guard in next version ---
      // Only send stats if they have a last_study_date (i.e. not uninitialized
      // defaults from a fresh device). Prevents overwriting real stats on server.
      // --- end DB MIGRATION ---
      const fresh = loadProgress();
      const stats = fresh.languages[l]?.stats ?? null;
      const hasRealStats = stats && stats.last_study_date !== null;
      try {
        const res = await apiFetch(`/api/progress/${l}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cards: payload, stats: hasRealStats ? stats : null }),
        });
        if (res.ok) cards.clear();
      } catch {
        // Will retry next flush.
      }
    }
  }, []);

  // Save to localStorage on every change.
  useEffect(() => {
    saveProgress(store);
  }, [store]);

  // Sync with server on mount / language change:
  // 1. Fetch server cards + stats
  // 2. Merge into local state (server fills gaps, local wins conflicts)
  // 3. Push full merged set back so server has everything
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fetch what the server has.
      let serverCards: Record<string, SM2Card> = {};
      let serverStats: LangStats | null = null;
      try {
        const res = await apiFetch(`/api/progress/${lang}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            // TEMPORARY FIX
            // I don't know how, but somehow, in one user case, there's "cards" entry inside cards entry
            // This should temporarily remove the entry until I found the problem
            const TEMP_CARDS_DATA: Record<string, SM2Card> = {}
            Object.keys(data.cards).forEach(key => {
                const value = data.cards[key] as SM2Card
                if (!value.due) {
                    return
                }

                TEMP_CARDS_DATA[key] = value
            })

            // serverCards = data.cards ?? {};
            serverCards = TEMP_CARDS_DATA
            serverStats = data.stats ?? null;
          }
        }
      } catch { /* offline — just use local */ }

      if (cancelled) return;

      // Merge server into local state.
      if (Object.keys(serverCards).length > 0 || serverStats) {
        dispatch({ type: 'MERGE_SERVER', lang, cards: serverCards, stats: serverStats });
      }

      // Push full merged state to server.
      // Read local from localStorage (dispatch is async so state isn't saved yet)
      // and merge with server data inline — same logic as the reducer.
      const fresh = loadProgress();
      const localCards = fresh.languages[lang]?.cards ?? {};
      const mergedCards = { ...serverCards, ...localCards };

      const localStats = fresh.languages[lang]?.stats ?? null;
      // Merge stats inline (can't rely on localStorage being up-to-date).
      let mergedStats: LangStats | null = localStats;
      if (serverStats && localStats) {
        const localDate = localStats.last_study_date ?? '';
        const serverDate = serverStats.last_study_date ?? '';
        mergedStats = {
          total_reviews: Math.max(localStats.total_reviews, serverStats.total_reviews),
          total_correct: Math.max(localStats.total_correct, serverStats.total_correct),
          streak_days: serverDate > localDate ? serverStats.streak_days : localStats.streak_days,
          last_study_date: serverDate > localDate ? serverStats.last_study_date : localStats.last_study_date,
        };
      } else if (serverStats) {
        mergedStats = serverStats;
      }

      // --- DB MIGRATION: remove guard in next version ---
      // Only push stats if they have a last_study_date (i.e. not uninitialized
      // defaults from a fresh device). Prevents overwriting real stats on server.
      // --- end DB MIGRATION ---
      const hasRealStats = mergedStats && mergedStats.last_study_date !== null;

      if (Object.keys(mergedCards).length > 0 || hasRealStats) {
        try {
          await apiFetch(`/api/progress/${lang}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cards: mergedCards, stats: hasRealStats ? mergedStats : null }),
          });
        } catch { /* will sync next time */ }
      }
    })();
    return () => { cancelled = true; };
  }, [lang]);

  // Periodically flush dirty cards to server.
  useEffect(() => {
    flushTimer.current = setInterval(flushDirty, 5000);
    return () => clearInterval(flushTimer.current);
  }, [flushDirty]);

  // Flush on page unload.
  useEffect(() => {
    const handler = () => { flushDirty(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [flushDirty]);

  const value: ProgressContextValue = {
    store,
    getLangProgress: (lang) => store.languages[lang],
    getCard: (lang, cardKey) => {
      return store.languages[lang]?.cards[cardKey] ?? newCard();
    },
    recordReview: (lang, cardKey, grade) => {
      dispatch({ type: 'RECORD_REVIEW', lang, cardKey, grade });
      // Compute the updated card to mark dirty — uses the same logic as the reducer.
      const lp = store.languages[lang];
      const card = lp?.cards[cardKey] ?? newCard();
      const updated = applyReview(card, grade);
      // Mark dirty for server sync.
      const dirty = dirtyRef.current;
      if (!dirty.has(lang)) dirty.set(lang, new Map());
      dirty.get(lang)!.set(cardKey, updated);
    },
    resetLang: (lang) => {
      dispatch({ type: 'RESET_LANG', lang });
      apiFetch(`/api/progress/${lang}`, { method: 'DELETE' })
        .then((r) => { if (!r.ok) console.error('reset lang failed:', r.status); })
        .catch((e) => console.error('reset lang failed:', e));
    },
    resetAll: () => {
      dispatch({ type: 'RESET_ALL' });
      apiFetch('/api/progress', { method: 'DELETE' })
        .then((r) => { if (!r.ok) console.error('reset all failed:', r.status); })
        .catch((e) => console.error('reset all failed:', e));
    },
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  return useContext(ProgressContext);
}
