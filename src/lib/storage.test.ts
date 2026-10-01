import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearJustCreated, markJustCreated, peekJustCreated } from './storage';

const KEY = 'K'.repeat(22);

describe('just-created edit key', () => {
  it('is kept per event until cleared', () => {
    markJustCreated('E1', KEY);
    expect(peekJustCreated('E1')).toBe(KEY);
    expect(peekJustCreated('E1')).toBe(KEY);
    expect(peekJustCreated('E2')).toBeNull();
    clearJustCreated('E1');
    expect(peekJustCreated('E1')).toBeNull();
  });

  it('ignores a stored value that is not an edit key', () => {
    sessionStorage.setItem('socialcal:created:E3', '1');
    expect(peekJustCreated('E3')).toBeNull();
  });

  describe('when storage throws', () => {
    afterEach(() => vi.restoreAllMocks());

    it('keeps the key in memory for the session', () => {
      const boom = () => {
        throw new Error('blocked');
      };
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom);
      markJustCreated('E4', KEY);
      expect(peekJustCreated('E4')).toBe(KEY);
      clearJustCreated('E4');
      expect(peekJustCreated('E4')).toBeNull();
    });
  });
});
