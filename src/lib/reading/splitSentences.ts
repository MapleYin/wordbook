import { normalizeSentenceWhitespace } from '@/lib/words/normalizeSentence';

/**
 * Common abbreviations whose trailing "." shouldn't be treated as a sentence
 * boundary. Best-effort heuristic, not exhaustive — see splitIntoSentences.
 */
const ABBREVIATIONS = new Set([
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'st',
  'vs',
  'e.g',
  'i.e',
  'etc',
  'jr',
  'sr',
  'approx',
]);

const SENTENCE_RE = /[^.!?]*[.!?]+[)"'”]*(?:\s+|$)/g;

const PARAGRAPH_END_RE = /[.!?][)"'”’\]]*$/;

/**
 * Text copied out of a PDF viewer typically has a hard line break at the end
 * of every wrapped line, including at real paragraph ends — unlike a blank
 * line between paragraphs, which PDF viewers rarely preserve. This tells
 * paragraph ends apart from mid-sentence wraps with a length + punctuation
 * heuristic: a wrapped line usually runs close to the document's typical line
 * width, while a paragraph's last line is usually shorter and ends with
 * sentence-terminating punctuation. A blank line, when present, is always
 * treated as a paragraph break.
 */
function reflowPdfLineBreaks(content: string): string {
  const rawLines = content.split(/\r\n|\r|\n/);
  const lineLengths = rawLines.map((line) => line.trim().length).filter((len) => len > 0);
  const typicalWidth = lineLengths.length > 0 ? Math.max(...lineLengths) : 0;

  const paragraphs: string[] = [];
  let current = '';
  // Length of the most recently appended raw line (not the accumulated
  // `current`) — a paragraph's last line is short relative to the document's
  // typical wrap width even after several prior lines have been joined onto it.
  let lastLineLength = 0;

  function flush() {
    if (current) paragraphs.push(current);
    current = '';
  }

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      lastLineLength = 0;
      continue;
    }
    if (!current) {
      current = line;
      lastLineLength = line.length;
      continue;
    }

    const isParagraphEnd = PARAGRAPH_END_RE.test(current) && lastLineLength < typicalWidth * 0.7;
    if (isParagraphEnd) {
      flush();
      current = line;
    } else if (/[a-zA-Z]-$/.test(current) && /^[a-zA-Z]/.test(line)) {
      current = current.slice(0, -1) + line;
    } else {
      current = `${current} ${line}`;
    }
    lastLineLength = line.length;
  }
  flush();

  return paragraphs.join('\n\n');
}

/**
 * Splits one already-normalized paragraph into sentence strings. A match
 * ending right after a known abbreviation (e.g. "Mr.") is merged with the
 * next match instead of being treated as a sentence boundary.
 */
function splitIntoSentences(paragraph: string): string[] {
  const sentences: string[] = [];
  let pending = '';
  let match: RegExpExecArray | null;
  SENTENCE_RE.lastIndex = 0;

  while ((match = SENTENCE_RE.exec(paragraph)) !== null) {
    pending += match[0];
    const trimmed = pending.trim();
    const wordBeforeDot = /([A-Za-z]+)\.[)"'”]*$/.exec(trimmed)?.[1]?.toLowerCase();
    if (wordBeforeDot && ABBREVIATIONS.has(wordBeforeDot)) continue;
    sentences.push(trimmed);
    pending = '';
  }
  if (pending.trim()) sentences.push(pending.trim());

  return sentences.filter((s) => s.length > 0);
}

/**
 * Turns raw pasted article text into paragraphs of clean sentence strings.
 * Paragraph boundaries — whether marked by a blank line or inferred by
 * `reflowPdfLineBreaks` from PDF-style hard-wrapped lines — are preserved;
 * within each paragraph, soft-wrapped lines are rejoined before splitting
 * into sentences.
 *
 * Sentence boundaries are a best-effort heuristic (no NLP dependency) — a
 * wrong split only affects how the article reads in the UI. The exact text a
 * word/phrase was selected from is always validated server-side against the
 * sentence it was clicked in, so a bad split can't corrupt saved data.
 */
export function splitArticleIntoParagraphs(content: string): string[][] {
  const paragraphs = reflowPdfLineBreaks(content)
    .split(/\r?\n\s*\r?\n/)
    .map((p) => normalizeSentenceWhitespace(p))
    .filter((p) => p.length > 0);

  return paragraphs.map(splitIntoSentences);
}
