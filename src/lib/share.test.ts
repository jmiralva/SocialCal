import { describe, expect, it } from 'vitest';
import { editUrl, eventUrl, readEditKeyFromHash } from './share';

describe('share helpers', () => {
  it('builds links', () => {
    expect(eventUrl('ABC', 'https://x.dev')).toBe('https://x.dev/e/ABC');
    expect(editUrl('ABC', 'KEY', 'https://x.dev')).toBe('https://x.dev/e/ABC#edit=KEY');
  });
  it('reads an edit key only in the expected format', () => {
    expect(readEditKeyFromHash(`#edit=${'a'.repeat(22)}`)).toBe('a'.repeat(22));
    expect(readEditKeyFromHash('#edit=short')).toBeNull();
    expect(readEditKeyFromHash('')).toBeNull();
  });
});
