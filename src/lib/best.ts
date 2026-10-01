import { rangeDays } from '../../shared/dates';
import type { Participant } from '../../shared/types';

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function countByDay(participants: Participant[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const person of participants) for (const d of new Set(person.dates)) counts.set(d, (counts.get(d) ?? 0) + 1);
  return counts;
}

export type DayScore = { date: string; count: number; available: string[] };

export type BestResult =
  | { kind: 'not-enough-people' }
  | { kind: 'no-majority'; max: number; total: number; closest: DayScore[] }
  | { kind: 'ok'; total: number; top: DayScore[]; next: DayScore[] };

export function computeBest(participants: Participant[], startDate: string, endDate: string, today: string): BestResult {
  const total = participants.length;
  const sets = participants.map((person) => ({ id: person.id, dates: new Set(person.dates) }));
  const scores: DayScore[] = rangeDays(startDate, endDate)
    .filter((d) => d >= today)
    .map((date) => {
      const available = sets.filter((s) => s.dates.has(date)).map((s) => s.id);
      return { date, count: available.length, available };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count || a.date.localeCompare(b.date));
  // Best days need two people with at least one in-range, upcoming date (a scored day).
  if (new Set(scores.flatMap((s) => s.available)).size < 2) return { kind: 'not-enough-people' };
  const max = scores[0]?.count ?? 0;
  if (max * 2 < total) {
    return { kind: 'no-majority', max, total, closest: scores.filter((s) => s.count === max).slice(0, 5) };
  }
  return {
    kind: 'ok',
    total,
    top: scores.filter((s) => s.count === max),
    next: scores.filter((s) => s.count < max && s.count * 2 >= total),
  };
}
