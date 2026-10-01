import { describe, it, expect } from 'vitest';
import { computeBest, countByDay, plural } from './best';
import type { Participant } from '../../shared/types';

const p = (id: string, dates: string[]): Participant => ({ id, name: id.toUpperCase(), dates });
const RANGE = ['2026-10-07', '2026-11-14'] as const;
const TODAY = '2026-10-01';

describe('plural', () => {
  it('uses singular only for exactly one', () => {
    expect(plural(1, 'day', 'days')).toBe('day');
    expect(plural(0, 'day', 'days')).toBe('days');
    expect(plural(2, 'day', 'days')).toBe('days');
  });
});

describe('countByDay', () => {
  it('counts people per date', () => {
    const counts = countByDay([p('a', ['2026-10-09', '2026-10-10']), p('b', ['2026-10-09'])]);
    expect(counts.get('2026-10-09')).toBe(2);
    expect(counts.get('2026-10-10')).toBe(1);
  });
});

describe('computeBest', () => {
  it('needs at least two people', () => {
    expect(computeBest([p('a', ['2026-10-09'])], ...RANGE, TODAY)).toEqual({ kind: 'not-enough-people', marked: ['a'] });
  });

  it('needs two people who have marked dates', () => {
    const people = [p('a', ['2026-10-09']), p('b', [])];
    expect(computeBest(people, ...RANGE, TODAY)).toEqual({ kind: 'not-enough-people', marked: ['a'] });
  });

  it('ignores a person whose only date is in the past', () => {
    const people = [p('a', ['2026-10-09']), p('b', ['2026-10-25'])];
    expect(computeBest(people, ...RANGE, '2026-10-20')).toEqual({ kind: 'not-enough-people', marked: ['b'] });
  });

  it('ignores a person whose only date is outside the range', () => {
    const people = [p('a', ['2026-12-25']), p('b', ['2026-10-09'])];
    expect(computeBest(people, ...RANGE, TODAY)).toEqual({ kind: 'not-enough-people', marked: ['b'] });
  });

  it('counts people who joined without dates in the total', () => {
    const people = [p('a', ['2026-10-09']), p('b', ['2026-10-09']), p('c', [])];
    const result = computeBest(people, ...RANGE, TODAY);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.total).toBe(3);
  });

  it('returns a clear winner and next best days at or above half', () => {
    const people = [
      p('a', ['2026-11-07', '2026-10-09', '2026-10-20']),
      p('b', ['2026-11-07', '2026-10-09']),
      p('c', ['2026-11-07', '2026-10-21']),
      p('d', []),
    ];
    const r = computeBest(people, ...RANGE, TODAY);
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.total).toBe(4);
    expect(r.top).toEqual([{ date: '2026-11-07', count: 3, available: ['a', 'b', 'c'] }]);
    expect(r.next.map((s) => [s.date, s.count])).toEqual([['2026-10-09', 2]]);
  });

  it('returns every tied top day sorted by date', () => {
    const people = [p('a', ['2026-10-24', '2026-10-17']), p('b', ['2026-10-17', '2026-10-24'])];
    const r = computeBest(people, ...RANGE, TODAY);
    expect(r.kind === 'ok' && r.top.map((s) => s.date)).toEqual(['2026-10-17', '2026-10-24']);
    expect(r.kind === 'ok' && r.next).toEqual([]);
  });

  it('reports no majority with up to five closest days', () => {
    const people = [
      p('a', ['2026-10-07', '2026-10-08', '2026-10-09']),
      p('b', ['2026-10-10', '2026-10-11', '2026-10-12']),
      p('c', []),
      p('d', []),
      p('e', []),
    ];
    const r = computeBest(people, ...RANGE, TODAY);
    expect(r.kind).toBe('no-majority');
    if (r.kind !== 'no-majority') return;
    expect(r.max).toBe(1);
    expect(r.total).toBe(5);
    expect(r.closest.map((s) => s.date)).toEqual(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
  });

  it('waits for two people with dates when nobody picked days', () => {
    const r = computeBest([p('a', []), p('b', [])], ...RANGE, TODAY);
    expect(r).toEqual({ kind: 'not-enough-people', marked: [] });
  });

  it('ignores past days and dates outside the range', () => {
    const people = [p('a', ['2026-10-08', '2026-12-01', '2026-10-20']), p('b', ['2026-10-08', '2026-12-01', '2026-10-20'])];
    const r = computeBest(people, ...RANGE, '2026-10-10');
    expect(r.kind === 'ok' && r.top.map((s) => s.date)).toEqual(['2026-10-20']);
  });
});
