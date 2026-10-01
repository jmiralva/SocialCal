import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { addDays, formatDayLong, type MonthGrid } from '../../shared/dates';
import { applySpan } from '../lib/selection';
import { isNumberMode, tally } from '../lib/marks';
import { copy } from '../copy';

type CalendarProps = {
  months: MonthGrid[];
  counts: Map<string, number>;
  total: number;
  mine: ReadonlySet<string>;
  selectableDays: string[];
  editable: boolean;
  weekStart?: number; // 0 = Sunday ... 6 = Saturday
  onChange: (next: Set<string>) => void;
};

const LONG_PRESS_MS = 280;
const MOVE_TOLERANCE_PX = 8;

const dateOf = (el: Element | null): string | null =>
  (el?.closest('[data-date]') as HTMLElement | null)?.dataset.date ?? null;

function WeekdayRow({ weekStart }: { weekStart: number }) {
  const days = [...copy.calendar.weekdays.slice(weekStart), ...copy.calendar.weekdays.slice(0, weekStart)];
  return (
    <div class="dow-row" aria-hidden="true">
      {days.map((d, i) => (
        <span key={i}>{d}</span>
      ))}
    </div>
  );
}

export function Calendar({ months, counts, total, mine, selectableDays, editable, weekStart = 0, onChange }: CalendarProps) {
  const selectable = useMemo(() => new Set(selectableDays), [selectableDays]);
  const gridRef = useRef<HTMLDivElement>(null);

  // Roving focus: one day is in the Tab order; arrow keys move between days.
  const inRange = useMemo(() => months.flatMap((m) => m.cells.flatMap((c) => (c?.inRange ? [c.iso] : []))), [months]);
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const tabStop = focusDate && inRange.includes(focusDate) ? focusDate : (selectableDays[0] ?? inRange[0]);
  const focusDay = (iso: string, preventScroll = false) =>
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${iso}"]`)?.focus({ preventScroll });

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.repeat) {
      e.preventDefault(); // a held Enter would otherwise toggle the day back and forth
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return; // leave browser shortcuts like Alt+Left (Back) alone
    const from = dateOf(e.target as Element);
    if (!from || !inRange.length) return;
    const first = inRange[0];
    const last = inRange[inRange.length - 1];
    let to: string;
    switch (e.key) {
      case 'ArrowLeft':
        to = addDays(from, -1);
        break;
      case 'ArrowRight':
        to = addDays(from, 1);
        break;
      case 'ArrowUp':
        to = addDays(from, -7);
        break;
      case 'ArrowDown':
        to = addDays(from, 7);
        break;
      case 'Home':
        to = first;
        break;
      case 'End':
        to = last;
        break;
      default:
        return;
    }
    e.preventDefault(); // even when clamped, so the page doesn't scroll
    if (to < first) to = first;
    if (to > last) to = last;
    setFocusDate(to);
    focusDay(to);
  };
  // Keyboard Enter/Space and screen reader activation arrive as a click with no pointer press before it.
  const onDayClick = (e: MouseEvent) => {
    if (e.detail > 0 && Date.now() < ignoreClickUntil.current) {
      ignoreClickUntil.current = 0;
      return;
    }
    const date = dateOf(e.currentTarget as Element);
    if (!editable || !date || !selectable.has(date)) return;
    emit(applySpan(mine, selectableDays, date, date, !mine.has(date)));
  };
  const latest = useRef({ mine, selectable, selectableDays, onChange });
  latest.current = { mine, selectable, selectableDays, onChange };

  const SWIPE_MS = 400;
  // Days the person just added themselves (tap, drag, keyboard). Each keeps its own timer so late drag days finish their swipe.
  const [swiping, setSwiping] = useState<ReadonlySet<string>>(new Set());
  const swipeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => swipeTimers.current.forEach(clearTimeout), []);
  const emit = (next: Set<string>) => {
    const { mine: current, onChange: send } = latest.current;
    const added = [...next].filter((d) => !current.has(d));
    if (added.length) {
      setSwiping((s) => new Set([...s, ...added]));
      for (const d of added) {
        clearTimeout(swipeTimers.current.get(d));
        swipeTimers.current.set(
          d,
          setTimeout(() => {
            swipeTimers.current.delete(d);
            setSwiping((s) => {
              const rest = new Set(s);
              rest.delete(d);
              return rest;
            });
          }, SWIPE_MS),
        );
      }
    }
    send(next);
  };
  const drag = useRef<{ from: string; to: string; add: boolean; snap: Set<string> } | null>(null);
  const press = useRef<{ x: number; y: number; date: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  // After a press toggles, its own click (detail >= 1, sometimes a task later on touch) must not toggle back.
  const ignoreClickUntil = useRef(0);

  const begin = (date: string) => {
    const { mine: current, selectableDays: days } = latest.current;
    const state = { from: date, to: date, add: !current.has(date), snap: new Set(current) };
    drag.current = state;
    emit(applySpan(state.snap, days, date, date, state.add));
  };

  useEffect(() => {
    const end = () => {
      if (press.current) {
        clearTimeout(press.current.timer);
        const date = press.current.date;
        press.current = null;
        begin(date); // quick tap toggles
      }
      const state = drag.current;
      drag.current = null;
      if (state) {
        ignoreClickUntil.current = Date.now() + 1000;
        // Safari and Firefox don't focus a button on click; this also moves focus to where a drag ended.
        focusDay(state.to, true);
      }
    };
    const cancel = () => {
      if (press.current) clearTimeout(press.current.timer);
      press.current = null;
      drag.current = null;
      ignoreClickUntil.current = 0;
    };
    const blockScroll = (e: TouchEvent) => {
      if (drag.current) e.preventDefault();
    };
    const grid = gridRef.current;
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
    grid?.addEventListener('touchmove', blockScroll, { passive: false });
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
      grid?.removeEventListener('touchmove', blockScroll);
    };
  }, []);

  const onPointerDown = (e: PointerEvent) => {
    ignoreClickUntil.current = 0;
    if (!editable) return;
    const date = dateOf(e.target as Element);
    if (!date || !selectable.has(date)) return;
    if ((e.pointerType || 'mouse') === 'mouse') {
      // No preventDefault: the browser focuses the day as mouse focus (no ring). .grid's user-select: none stops text selection.
      begin(date);
      return;
    }
    press.current = {
      x: e.clientX,
      y: e.clientY,
      date,
      timer: setTimeout(() => {
        if (!press.current) return;
        const d = press.current.date;
        press.current = null;
        begin(d);
        navigator.vibrate?.(10);
      }, LONG_PRESS_MS),
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > MOVE_TOLERANCE_PX) {
      clearTimeout(press.current.timer);
      press.current = null; // the user is scrolling
    }
    const state = drag.current;
    if (!state) return;
    const under = (typeof document.elementFromPoint === 'function' && document.elementFromPoint(e.clientX, e.clientY)) || (e.target as Element);
    const date = dateOf(under);
    if (date && latest.current.selectable.has(date)) {
      state.to = date;
      emit(applySpan(state.snap, latest.current.selectableDays, state.from, date, state.add));
    }
  };

  const numbers = isNumberMode(total);

  return (
    <div
      class="calendar"
      ref={gridRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => {
        if (drag.current || press.current) e.preventDefault(); // Android long-press menu during hold-drag
      }}
    >
      <div class="months">
        {months.map((month) => (
          <section class="month" key={month.key}>
            <h3>{month.label}</h3>
            <WeekdayRow weekStart={weekStart} />
            <div class={`grid${editable ? '' : ' is-readonly'}`}>
              {month.cells.map((c, i) => {
                if (!c) return <div key={`blank-${i}`} aria-hidden="true" />;
                if (!c.inRange) {
                  return (
                    <div key={c.iso} class="day is-out" aria-hidden="true">
                      <span class="num">{c.day}</span>
                      <span class="mark" />
                    </div>
                  );
                }
                const n = counts.get(c.iso) ?? 0;
                const past = !selectable.has(c.iso);
                const shaded = numbers && n > 0 && !past;
                const t = numbers ? null : tally(n, c.iso);
                const cls = ['day', past ? 'is-past' : 'is-open', mine.has(c.iso) && 'is-mine', shaded && 'is-shaded', swiping.has(c.iso) && 'is-swiping']
                  .filter(Boolean)
                  .join(' ');
                return (
                  <button
                    type="button"
                    key={c.iso}
                    class={cls}
                    style={shaded ? `--share: ${(n / total).toFixed(3)}` : undefined}
                    data-date={c.iso}
                    tabIndex={c.iso === tabStop ? 0 : -1}
                    aria-label={copy.calendar.dayLabel(formatDayLong(c.iso), n, total)}
                    aria-pressed={editable ? mine.has(c.iso) : undefined}
                    aria-disabled={!editable || past ? true : undefined}
                    onFocus={() => setFocusDate(c.iso)}
                    onClick={onDayClick}
                  >
                    <i class="hl" aria-hidden="true" />
                    <span class="num" aria-hidden="true">{c.day}</span>
                    <span class="mark" aria-hidden="true">
                      {numbers
                        ? n > 0 && <span class="n">{n}</span>
                        : t && (
                            <svg viewBox={`0 0 ${t.width} 16`} style={`width: ${t.width}px`}>
                              <path d={t.d} />
                            </svg>
                          )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div class="legend">
        <span>
          <i class="lg-hl" aria-hidden="true" />
          {copy.calendar.legendMine}
        </span>
        <span>
          {numbers ? (
            // A sample count, hidden from screen readers, so it isn't copy.
            <b class="lg-n" aria-hidden="true">5</b>
          ) : (
            <svg class="lg-tally" viewBox="0 0 22 16" aria-hidden="true">
              <path d="M4 2 L4 14 M9 2 L9 14 M14 2 L14 14" />
            </svg>
          )}
          {numbers ? copy.calendar.legendNumber : copy.calendar.legendTally}
        </span>
        {editable && (
          <span>
            <i class="lg-in" aria-hidden="true" />
            {copy.calendar.legendSelectable}
          </span>
        )}
        <span>
          <i class="lg-out" aria-hidden="true" />
          {copy.calendar.legendOut}
        </span>
      </div>
    </div>
  );
}
