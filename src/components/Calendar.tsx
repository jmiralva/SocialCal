import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { MonthGrid } from '../../shared/dates';
import { applySpan } from '../lib/selection';

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

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const LONG_PRESS_MS = 280;
const MOVE_TOLERANCE_PX = 8;

const dateOf = (el: Element | null): string | null =>
  (el?.closest('[data-date]') as HTMLElement | null)?.dataset.date ?? null;

function WeekdayRow({ weekStart }: { weekStart: number }) {
  const days = [...WEEKDAYS.slice(weekStart), ...WEEKDAYS.slice(0, weekStart)];
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
  const latest = useRef({ mine, selectable, selectableDays, onChange });
  latest.current = { mine, selectable, selectableDays, onChange };
  const drag = useRef<{ from: string; add: boolean; snap: Set<string> } | null>(null);
  const press = useRef<{ x: number; y: number; date: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  const begin = (date: string) => {
    const { mine: current, selectableDays: days, onChange: emit } = latest.current;
    const state = { from: date, add: !current.has(date), snap: new Set(current) };
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
      drag.current = null;
    };
    const cancel = () => {
      if (press.current) clearTimeout(press.current.timer);
      press.current = null;
      drag.current = null;
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
    if (!editable) return;
    const date = dateOf(e.target as Element);
    if (!date || !selectable.has(date)) return;
    if ((e.pointerType || 'mouse') === 'mouse') {
      e.preventDefault();
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
      latest.current.onChange(applySpan(state.snap, latest.current.selectableDays, state.from, date, state.add));
    }
  };

  return (
    <div
      class="calendar"
      ref={gridRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
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
                if (!c) return <div key={`blank-${i}`} />;
                if (!c.inRange) {
                  return (
                    <div key={c.iso} class="day is-out">
                      <span>{c.day}</span>
                      <small />
                    </div>
                  );
                }
                const n = counts.get(c.iso) ?? 0;
                const lvl = n && total ? Math.max(1, Math.round((n / total) * 5)) : 0;
                const past = !selectable.has(c.iso);
                const cls = ['day', `lvl-${lvl}`, mine.has(c.iso) && 'is-mine', past && 'is-past'].filter(Boolean).join(' ');
                return (
                  <div key={c.iso} class={cls} data-date={c.iso}>
                    <span>{c.day}</span>
                    <small>{n ? `${n}/${total}` : ''}</small>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div class="legend">
        <span>
          <span class="swatch mine" />
          Your days
        </span>
        <span>
          <span class="swatch others" />
          Others available
        </span>
      </div>
    </div>
  );
}
