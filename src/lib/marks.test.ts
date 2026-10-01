import { describe, expect, it } from 'vitest';
import { isNumberMode, tally } from './marks';

const count = (s: string, ch: string) => s.split(ch).length - 1;

describe('tally', () => {
  it('draws nothing for nobody', () => {
    expect(tally(0, '2026-10-17')).toBeNull();
  });

  it('draws one stroke per person, with every fifth as a diagonal', () => {
    for (const n of [1, 4, 5, 6, 9]) {
      const t = tally(n, '2026-10-17')!;
      expect(count(t.d, 'M')).toBe(n);
      expect(count(t.d, 'L')).toBe(Math.floor(n / 5));
    }
  });

  it('widens by one group per five people', () => {
    expect(tally(4, 'x')!.width).toBe(29);
    expect(tally(5, 'x')!.width).toBe(29);
    expect(tally(6, 'x')!.width).toBe(56);
    expect(tally(9, 'x')!.width).toBe(56);
  });

  it('is stable for the same day and count, and varies by day', () => {
    expect(tally(3, '2026-10-17')!.d).toBe(tally(3, '2026-10-17')!.d);
    expect(tally(3, '2026-10-17')!.d).not.toBe(tally(3, '2026-10-18')!.d);
  });
});

describe('isNumberMode', () => {
  it('switches at 10 people', () => {
    expect(isNumberMode(9)).toBe(false);
    expect(isNumberMode(10)).toBe(true);
  });
});
