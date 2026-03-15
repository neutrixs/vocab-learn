import { createContext, useContext, useReducer, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { ProgressStore, SM2Card, LangProgress, LangStats } from '../types/progress';
import type { ReviewGrade } from '../types/study';
import { emptyStore, filterValidCards } from '../lib/storage';
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
      const defaultStats: LangStats = { streak_days: 0, last_study_date: null, total_reviews: 0, total_correct: 0 };

      // Server cards have absolute priority — overwrite local.
      // Stats: use server stats if available, otherwise fall back to defaults.
      return {
        ...store,
        languages: {
          ...store.languages,
          [lang]: {
            cards,
            stats: { ...defaultStats, ...serverStats },
          },
        },
      };
    }
    default:
      return store;
  }
}

const ProgressContext = createContext<ProgressContextValue>({} as ProgressContextValue);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(reducer, undefined, emptyStore);
  const { lang } = useLanguage();
  const flushTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Track dirty cards in a ref so it's never stale.
  const dirtyRef = useRef(new Map<string, Map<string, SM2Card>>());

  // Keep a ref to the latest store so flushDirty can read current stats.
  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; }, [store]);

  const flushDirty = useCallback(async () => {
    for (const [l, cards] of dirtyRef.current) {
      if (cards.size === 0) continue;
      const payload: Record<string, SM2Card> = {};
      for (const [k, v] of cards) payload[k] = v;
      const stats = storeRef.current.languages[l]?.stats ?? null;
      try {
        const res = await apiFetch(`/api/progress/${l}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cards: payload, stats }),
        });
        if (res.ok) cards.clear();
      } catch {
        // Will retry next flush.
      }
    }
  }, []);

  // Sync with server on mount / language change.
  // Server is the source of truth — overwrite local state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let serverCards: Record<string, SM2Card> = {};
      let serverStats: LangStats | null = null;
      try {
        const res = await apiFetch(`/api/progress/${lang}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            serverCards = filterValidCards(data.cards ?? {});
            serverStats = data.stats ?? null;
          }
        }
      } catch { /* offline — start empty */ }

      if (cancelled) return;

      if (Object.keys(serverCards).length > 0 || serverStats) {
        dispatch({ type: 'MERGE_SERVER', lang, cards: serverCards, stats: serverStats });
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
