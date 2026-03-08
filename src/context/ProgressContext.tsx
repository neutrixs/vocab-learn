import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { ProgressStore, SM2Card, LangProgress } from '../types/progress';
import type { ReviewGrade } from '../types/study';
import { loadProgress, saveProgress } from '../lib/storage';
import { applyReview, newCard } from '../lib/sm2';
import { updateStreak } from '../lib/storage';

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
  | { type: 'RESET_ALL' };

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
    default:
      return store;
  }
}

const ProgressContext = createContext<ProgressContextValue>({} as ProgressContextValue);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(reducer, undefined, loadProgress);

  useEffect(() => {
    saveProgress(store);
  }, [store]);

  const value: ProgressContextValue = {
    store,
    getLangProgress: (lang) => store.languages[lang],
    getCard: (lang, cardKey) => {
      return store.languages[lang]?.cards[cardKey] ?? newCard();
    },
    recordReview: (lang, cardKey, grade) =>
      dispatch({ type: 'RECORD_REVIEW', lang, cardKey, grade }),
    resetLang: (lang) => dispatch({ type: 'RESET_LANG', lang }),
    resetAll: () => dispatch({ type: 'RESET_ALL' }),
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  return useContext(ProgressContext);
}
