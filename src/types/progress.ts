export interface SM2Card {
  ease_factor: number;
  interval: number;
  repetitions: number;
  due: string; // ISO date string "YYYY-MM-DD"
  last_reviewed: string | null;
  created: string;
}

export interface LangStats {
  streak_days: number;
  last_study_date: string | null;
  total_reviews: number;
  total_correct: number;
}

export interface LangProgress {
  cards: Record<string, SM2Card>;
  stats: LangStats;
}

export interface ProgressStore {
  version: 1;
  languages: Record<string, LangProgress>;
}
