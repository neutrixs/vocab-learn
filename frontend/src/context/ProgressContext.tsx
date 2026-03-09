import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import type { ProgressStore, SM2Card, LangProgress } from '../types/progress';
import type { ReviewGrade } from '../types/study';
import { loadProgress, saveProgress } from '../lib/storage';
import { applyReview, newCard } from '../lib/sm2';
import { updateStreak } from '../lib/storage';
import { apiFetch } from '../lib/apiClient';

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

// Tracks cards that changed this session and need pushing to server.
const dirtyCards = new Map<string, Map<string, SM2Card>>();

function markDirty(lang: string, cardKey: string, card: SM2Card) {
  if (!dirtyCards.has(lang)) dirtyCards.set(lang, new Map());
  dirtyCards.get(lang)!.set(cardKey, card);
}

async function flushDirty() {
  for (const [lang, cards] of dirtyCards) {
    if (cards.size === 0) continue;
    const payload: Record<string, SM2Card> = {};
    for (const [k, v] of cards) payload[k] = v;
    try {
      await apiFetch(`/api/progress/${lang}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: payload }),
      });
      cards.clear();
    } catch {
      // Will retry next flush.
    }
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(reducer, undefined, loadProgress);
  const flushTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Save to localStorage on every change.
  useEffect(() => {
    saveProgress(store);
  }, [store]);

  // Fetch server progress on mount for each known language.
  useEffect(() => {
    for (const lang of Object.keys(store.languages)) {
      apiFetch(`/api/progress/${lang}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((cards) => {
          if (cards && typeof cards === 'object') {
            dispatch({ type: 'MERGE_SERVER', lang, cards });
          }
        })
        .catch(() => {});
    }
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodically flush dirty cards to server.
  useEffect(() => {
    flushTimer.current = setInterval(flushDirty, 5000);
    return () => clearInterval(flushTimer.current);
  }, []);

  // Flush on page unload.
  useEffect(() => {
    const handler = () => { flushDirty(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const value: ProgressContextValue = {
    store,
    getLangProgress: (lang) => store.languages[lang],
    getCard: (lang, cardKey) => {
      return store.languages[lang]?.cards[cardKey] ?? newCard();
    },
    recordReview: (lang, cardKey, grade) => {
      dispatch({ type: 'RECORD_REVIEW', lang, cardKey, grade });
      // Track dirty card after the next render.
      const lp = store.languages[lang];
      const card = lp?.cards[cardKey] ?? newCard();
      const updated = applyReview(card, grade);
      markDirty(lang, cardKey, updated);
    },
    resetLang: (lang) => dispatch({ type: 'RESET_LANG', lang }),
    resetAll: () => dispatch({ type: 'RESET_ALL' }),
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  return useContext(ProgressContext);
}
