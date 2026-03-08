export interface Sentence {
  id: string;
  text: string;
  note: string | null;
}

export interface RecallPrompt {
  id: string;
  prompt: string;
  accepted_forms: string[];
  note: string | null;
}

export interface WordEntry {
  word: string;
  lang: string;
  difficulty: number;
  part_of_speech: string;
  english_gloss: string;
  sentences: Sentence[];
  recall_prompts: RecallPrompt[];
}

export interface WordIndexEntry {
  word: string;
  file: string;
  difficulty: number;
  part_of_speech: string;
  tags: string[];
}

export interface WordIndex {
  lang: string;
  words: WordIndexEntry[];
}
