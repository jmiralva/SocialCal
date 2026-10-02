import { describe, expect, it } from 'vitest';
import { linkify } from './linkify';

describe('linkify', () => {
  it('returns plain text as one text part', () => {
    expect(linkify('Bring snacks')).toEqual([{ type: 'text', value: 'Bring snacks' }]);
  });

  it('splits out http and https URLs', () => {
    expect(linkify('Tickets: https://a.com/x?y=1 or http://b.org')).toEqual([
      { type: 'text', value: 'Tickets: ' },
      { type: 'link', value: 'https://a.com/x?y=1' },
      { type: 'text', value: ' or ' },
      { type: 'link', value: 'http://b.org' },
    ]);
  });

  it('leaves trailing punctuation out of the link', () => {
    expect(linkify('See https://a.com/.')).toEqual([
      { type: 'text', value: 'See ' },
      { type: 'link', value: 'https://a.com/' },
      { type: 'text', value: '.' },
    ]);
    expect(linkify('(https://a.com), ok')).toEqual([
      { type: 'text', value: '(' },
      { type: 'link', value: 'https://a.com' },
      { type: 'text', value: '), ok' },
    ]);
  });

  it('keeps line breaks in the text parts', () => {
    expect(linkify('Line one\nhttps://a.com\nLine three')).toEqual([
      { type: 'text', value: 'Line one\n' },
      { type: 'link', value: 'https://a.com' },
      { type: 'text', value: '\nLine three' },
    ]);
  });

  it('does not link other schemes or bare domains', () => {
    expect(linkify('javascript:alert(1) a.com')).toEqual([{ type: 'text', value: 'javascript:alert(1) a.com' }]);
  });
});
