export const DAY_MS = 86_400_000;

const toUTC = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const fromUTC = (t: number) => new Date(t).toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  return fromUTC(toUTC(iso) + n * DAY_MS);
}

export function daysInclusive(start: string, end: string): number {
  return Math.round((toUTC(end) - toUTC(start)) / DAY_MS) + 1;
}

export function rangeDays(start: string, end: string): string[] {
  const out: string[] = [];
  for (let t = toUTC(start), last = toUTC(end); t <= last; t += DAY_MS) out.push(fromUTC(t));
  return out;
}

export function todayLocalISO(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function formatDay(iso: string): string {
  return new Date(toUTC(iso)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// Cached: the calendar formats every day on every render, including on each pointer move during a drag.
const LONG_DAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

export function formatDayLong(iso: string): string {
  return LONG_DAY.format(new Date(toUTC(iso)));
}

export type MonthCell = { iso: string; day: number; inRange: boolean };
export type MonthGrid = { key: string; label: string; cells: (MonthCell | null)[] };

// weekStart: 0 = Sunday ... 6 = Saturday (same numbering as getUTCDay)
export function monthGrids(start: string, end: string, weekStart = 0): MonthGrid[] {
  const grids: MonthGrid[] = [];
  const startDate = new Date(toUTC(start));
  const endDate = new Date(toUTC(end));
  let y = startDate.getUTCFullYear();
  let m = startDate.getUTCMonth();
  while (y < endDate.getUTCFullYear() || (y === endDate.getUTCFullYear() && m <= endDate.getUTCMonth())) {
    const first = new Date(Date.UTC(y, m, 1));
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const cells: (MonthCell | null)[] = Array((first.getUTCDay() - weekStart + 7) % 7).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = fromUTC(Date.UTC(y, m, day));
      cells.push({ iso, day, inRange: iso >= start && iso <= end });
    }
    grids.push({
      key: `${y}-${String(m + 1).padStart(2, '0')}`,
      label: first.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      cells,
    });
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  return grids;
}
