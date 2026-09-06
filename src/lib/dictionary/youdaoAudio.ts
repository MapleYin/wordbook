/** Youdao's TTS endpoint: works for virtually any word/phrase with no lookup needed. type=2 is UK pronunciation. */
export function getYoudaoAudioUrl(word: string): string {
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
}
