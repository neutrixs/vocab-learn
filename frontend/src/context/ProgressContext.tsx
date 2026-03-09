import { createContext, useContext, useReducer, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { ProgressStore, SM2Card, LangProgress } from '../types/progress';
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
  | { type: 'MERGE_SERVER'; lang: string; cards: Record<string, SM2Card> };

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
      const { lang, cards } = action;
      const lp = store.languages[lang];
      if (!lp) {
        return {
          ...store,
          languages: {
            ...store.languages,
            [lang]: {
              cards,
              stats: { streak_days: 0, last_study_date: null, total_reviews: 0, total_correct: 0 },
            },
          },
        };
      }
      // Server cards fill in anything missing locally.
      const merged = { ...cards, ...lp.cards };
      return {
        ...store,
        languages: { ...store.languages, [lang]: { ...lp, cards: merged } },
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
      try {
        const res = await apiFetch(`/api/progress/${l}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cards: payload }),
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
  // 1. Fetch server cards
  // 2. Merge into local state (server fills gaps, local wins conflicts)
  // 3. Push full merged set back so server has everything
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fetch what the server has.
      let serverCards: Record<string, SM2Card> = {};
      try {
        const res = await apiFetch(`/api/progress/${lang}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') serverCards = data;
        }
      } catch { /* offline — just use local */ }

      if (cancelled) return;

      // Merge server into local state.
      if (Object.keys(serverCards).length > 0) {
        dispatch({ type: 'MERGE_SERVER', lang, cards: serverCards });
      }

      // Push full local state (including what we just merged) to server.
      // Read fresh from localStorage since dispatch is async.
      const fresh = loadProgress();
      const localCards = fresh.languages[lang]?.cards ?? {};
      const merged = { ...serverCards, ...localCards };
      if (Object.keys(merged).length > 0) {
        try {
          await apiFetch(`/api/progress/${lang}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cards: merged }),
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
