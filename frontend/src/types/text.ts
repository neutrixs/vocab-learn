export interface TextEntry {
  id: string;
  lang: string;
  date: string;
  topic: string;
  subtopic: string;
  title: string;
  body: string;
  vocab: string[];
}

export interface TextIndexEntry {
  id: string;
  date: string;
  topic: string;
  subtopic: string;
  title: string;
  file: string;
}

export interface TextsIndex {
  lang: string;
  texts: TextIndexEntry[];
}

export interface Subtopic {
  id: string;
  label_tr: string;
  label_en: string;
}

export interface Topic {
  id: string;
  label_tr: string;
  label_en: string;
  subtopics: Subtopic[];
}

export interface TopicsConfig {
  topics: Topic[];
}
