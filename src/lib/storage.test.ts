import { describe, expect, it } from 'vitest';
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
});
