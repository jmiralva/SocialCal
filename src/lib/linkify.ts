export type TextPart = { type: 'text' | 'link'; value: string };

// Only http(s), so a description can never produce a javascript: link.
const URL_RE = /https?:\/\/[^\s<>"]+/g;
// Punctuation that usually ends the sentence rather than the URL.
const TRAILING_RE = /[.,;:!?)\]}'"]+$/;

export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const url = match[0].replace(TRAILING_RE, '');
    if (!url.match(/^https?:\/\/./)) continue;
    const start = match.index!;
    if (start > last) parts.push({ type: 'text', value: text.slice(last, start) });
    parts.push({ type: 'link', value: url });
    last = start + url.length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}
