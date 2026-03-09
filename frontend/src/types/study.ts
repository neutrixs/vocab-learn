export type StudyMode = 'recognition' | 'recall';

export interface StudyItem {
  word: string;
  mode: StudyMode;
  cardKey: string; // "{word}::{mode}"
  isNew: boolean;
}

export type ReviewGrade = 'pass' | 'fail';

export interface SessionResult {
  word: string;
  mode: StudyMode;
  grade: ReviewGrade;
  timestamp: string;
}
