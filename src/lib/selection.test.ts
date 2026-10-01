import { describe, it, expect } from 'vitest';
import { applySpan } from './selection';

const days = ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
const sorted = (s: Set<string>) => [...s].sort();

describe('applySpan', () => {
  it('adds every day between from and to, in either direction', () => {
    expect(sorted(applySpan(new Set(), days, '2026-10-08', '2026-10-10', true))).toEqual(['2026-10-08', '2026-10-09', '2026-10-10']);
    expect(sorted(applySpan(new Set(), days, '2026-10-10', '2026-10-08', true))).toEqual(['2026-10-08', '2026-10-09', '2026-10-10']);
  });

  it('removes a span and keeps days outside it', () => {
    const base = new Set(days);
    expect(sorted(applySpan(base, days, '2026-10-08', '2026-10-09', false))).toEqual(['2026-10-07', '2026-10-10', '2026-10-11']);
  });

  it('a single day toggles just that day', () => {
    expect(sorted(applySpan(new Set(['2026-10-07']), days, '2026-10-09', '2026-10-09', true))).toEqual(['2026-10-07', '2026-10-09']);
  });

  it('returns an unchanged copy when an endpoint is not selectable', () => {
    const base = new Set(['2026-10-07']);
    const out = applySpan(base, days, '2026-10-01', '2026-10-09', true);
    expect(sorted(out)).toEqual(['2026-10-07']);
    expect(out).not.toBe(base);
  });

  it('never mutates the base set', () => {
    const base = new Set<string>();
    applySpan(base, days, '2026-10-07', '2026-10-11', true);
    expect(base.size).toBe(0);
  });
});
