export interface SavedWordEntry {
  /** Unique within one article render: `${sentenceKey}:${start}-${end}`. */
  id: string;
  sentenceKey: string;
  start: number;
  end: number;
  text: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
}
