/**
 * Cleans line breaks out of text pasted from a hard-wrapped source (a PDF, a
 * printed page, an e-reader). A trailing hyphen before a break means the word
 * itself was split across lines, so those pieces rejoin without a space or the
 * hyphen; any other break (including blank lines from a paragraph split)
 * becomes a single space.
 */
export function normalizeSentenceWhitespace(text: string): string {
  const lines = text.split(/\r\n|\r|\n/).map((line) => line.trim());

  let result = '';
  for (const line of lines) {
    if (!line) continue;
    if (!result) {
      result = line;
    } else if (/[a-zA-Z]-$/.test(result) && /^[a-zA-Z]/.test(line)) {
      result = result.slice(0, -1) + line;
    } else {
      result = `${result} ${line}`;
    }
  }

  return result.replace(/[ \t]+/g, ' ').trim();
}
