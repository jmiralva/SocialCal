import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { weekStartForLocale } from './weekStart';

describe('weekStartForLocale', () => {
  it('uses the locale week info', () => {
    expect(weekStartForLocale('en-US')).toBe(0);
    expect(weekStartForLocale('en-GB')).toBe(1);
    expect(weekStartForLocale('fa-IR')).toBe(6);
  });

  describe('without week info (Firefox)', () => {
    const proto = Intl.Locale.prototype;
    const saved = ['getWeekInfo', 'weekInfo'].map((k) => [k, Object.getOwnPropertyDescriptor(proto, k)] as const);

    beforeEach(() => {
      for (const [k] of saved) Object.defineProperty(proto, k, { value: undefined, configurable: true });
    });
    afterEach(() => {
      for (const [k, d] of saved) if (d) Object.defineProperty(proto, k, d);
    });

    it('falls back to the region', () => {
      expect(weekStartForLocale('en-US')).toBe(0);
      expect(weekStartForLocale('de-DE')).toBe(1);
      expect(weekStartForLocale('ja')).toBe(0); // bare language maximizes to JP
      expect(weekStartForLocale('fa-IR')).toBe(1); // fallback only knows Sunday or Monday
    });
  });

  it('defaults to Sunday for an invalid tag', () => {
    expect(weekStartForLocale('not a locale!')).toBe(0);
  });
});
