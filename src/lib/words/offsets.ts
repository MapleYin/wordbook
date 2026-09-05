export interface SentenceToken {
  text: string;
  start: number;
  end: number;
  isWord: boolean;
}

const TOKEN_RE = /[A-Za-z''-]+|[^A-Za-z''-]+/g;

export function tokenizeSentence(sentence: string): SentenceToken[] {
  const tokens: SentenceToken[] = [];
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(sentence)) !== null) {
    const text = match[0];
    tokens.push({
      text,
      start: match.index,
      end: match.index + text.length,
      isWord: /[A-Za-z]/.test(text),
    });
  }
  return tokens;
}
