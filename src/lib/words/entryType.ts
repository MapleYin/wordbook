import type { EntryType } from './types';

/** A selection spanning more than one token (i.e. containing whitespace) is a phrase. */
export function inferEntryType(text: string): EntryType {
  return /\s/.test(text.trim()) ? 'phrase' : 'word';
}
