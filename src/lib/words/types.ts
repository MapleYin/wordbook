export type ExplanationLanguage = 'zh' | 'en';
export type SourceType = 'book' | 'article' | 'other';
export type EntryType = 'word' | 'phrase';

export interface Source {
  id: string;
  user_id: string;
  title: string;
  type: SourceType;
  created_at: string;
}

export interface Sentence {
  id: string;
  user_id: string;
  source_id: string | null;
  text: string;
  translation: string | null;
  translation_language: ExplanationLanguage | null;
  created_at: string;
}

export interface WordEntry {
  id: string;
  user_id: string;
  sentence_id: string;
  word: string;
  headword: string;
  highlight_start: number;
  highlight_end: number;
  language: ExplanationLanguage;
  explanation: string;
  part_of_speech: string;
  definition: string;
  phonetic: string;
  entry_type: EntryType;
  created_at: string;
}

export interface SentenceWithSource extends Sentence {
  source: Source | null;
}

export interface WordEntryWithSentence extends WordEntry {
  sentence: SentenceWithSource;
}

/** Shape of a `word_dictionary_cache` row — a historical phonetic fallback for older entries. */
export interface DictionaryEntry {
  phonetic: string | null;
}

export interface WordSelection {
  start: number;
  end: number;
  text: string;
}
