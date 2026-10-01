import { afterEach, describe, expect, it, vi } from 'vitest';
import { consumeJustCreated, loadIdentity, markJustCreated, saveIdentity } from './storage';

describe('identity storage', () => {
  it('merges and persists per event', () => {
    saveIdentity('E1', { participantId: 'p', token: 't' });
    saveIdentity('E1', { editKey: 'k' });
    expect(loadIdentity('E1')).toEqual({ participantId: 'p', token: 't', editKey: 'k' });
    expect(loadIdentity('E2')).toEqual({});
  });

  it('survives corrupt data', () => {
    localStorage.setItem('socialcal:E3', '{not json');
    expect(loadIdentity('E3')).toEqual({});
  });

  it('just-created flag is read once', () => {
    markJustCreated('E4');
    expect(consumeJustCreated('E4')).toBe(true);
    expect(consumeJustCreated('E4')).toBe(false);
  });

  it('non-object stored JSON returns {}', () => {
    for (const raw of ['null', '[1]', '"x"', '5']) {
      localStorage.setItem('socialcal:E5', raw);
      expect(loadIdentity('E5')).toEqual({});
    }
  });

  describe('when storage throws', () => {
    afterEach(() => vi.restoreAllMocks());

    it('keeps identity and the just-created flag in memory for the session', () => {
      const boom = () => {
        throw new Error('blocked');
      };
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom);
      saveIdentity('E6', { editKey: 'k' });
      saveIdentity('E6', { participantId: 'p', token: 't' });
      expect(loadIdentity('E6')).toEqual({ editKey: 'k', participantId: 'p', token: 't' });
      markJustCreated('E6');
      expect(consumeJustCreated('E6')).toBe(true);
      expect(consumeJustCreated('E6')).toBe(false);
    });
  });
});
