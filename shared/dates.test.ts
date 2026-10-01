import { describe, it, expect } from 'vitest';
import { addDays, daysInclusive, formatDay, formatDayLong, monthGrids, rangeDays, todayLocalISO } from './dates';

describe('dates', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });

  it('counts days inclusively', () => {
    expect(daysInclusive('2026-10-07', '2026-10-07')).toBe(1);
    expect(daysInclusive('2026-01-01', '2026-12-31')).toBe(365);
  });

  it('lists every day in a range', () => {
    expect(rangeDays('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });

  it('uses the local calendar date for today', () => {
    expect(todayLocalISO(new Date(2026, 8, 30, 23, 30))).toBe('2026-09-30');
    expect(todayLocalISO(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });

  it('formats a day as weekday, month, day', () => {
    expect(formatDay('2026-10-24')).toBe('Sat, Oct 24');
  });

  it('formats a day with the full weekday and month, without shifting it', () => {
    expect(formatDayLong('2026-10-11')).toBe('Sunday, October 11');
    expect(formatDayLong('2026-11-01')).toBe('Sunday, November 1');
  });

  it('builds month grids with leading blanks and range flags', () => {
    const grids = monthGrids('2026-10-07', '2026-11-14');
    expect(grids.map((g) => g.label)).toEqual(['October 2026', 'November 2026']);
    const oct = grids[0];
    expect(oct.key).toBe('2026-10');
    expect(oct.cells.slice(0, 4)).toEqual([null, null, null, null]); // Oct 1 2026 is a Thursday
    expect(oct.cells[4]).toEqual({ iso: '2026-10-01', day: 1, inRange: false });
    expect(oct.cells.filter(Boolean)).toHaveLength(31);
    expect(oct.cells.find((c) => c?.day === 7)?.inRange).toBe(true);
    const nov = grids[1];
    expect(nov.cells[0]).toEqual({ iso: '2026-11-01', day: 1, inRange: true }); // Nov 1 2026 is a Sunday
    expect(nov.cells.find((c) => c?.day === 15)?.inRange).toBe(false);
  });

  it('offsets leading blanks by the week start', () => {
    const blanks = (g: { cells: unknown[] }) => g.cells.findIndex(Boolean);
    const [oct, nov] = monthGrids('2026-10-07', '2026-11-14', 1); // Monday
    expect(blanks(oct)).toBe(3); // Thursday
    expect(blanks(nov)).toBe(6); // Sunday lands in the last column
    expect(blanks(monthGrids('2026-10-07', '2026-10-07', 6)[0])).toBe(5); // Saturday start
  });
});
