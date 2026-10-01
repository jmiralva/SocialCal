import { act, fireEvent, render } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { describe, expect, it, vi } from 'vitest';
import { Calendar } from './Calendar';
import { monthGrids, rangeDays } from '../../shared/dates';

function Harness({
  initial = [],
  editable = true,
  weekStart,
  range = ['2026-10-07', '2026-10-20'],
  selectable = rangeDays('2026-10-09', range[1]), // days before Oct 9 are "past"
  total = 3,
  counts = new Map([['2026-10-09', 2]]),
  onChange = () => {},
}: {
  initial?: string[];
  editable?: boolean;
  weekStart?: number;
  range?: [string, string];
  selectable?: string[];
  total?: number;
  counts?: Map<string, number>;
  onChange?: (d: string[]) => void;
}) {
  const [mine, setMine] = useState(new Set(initial));
  return (
    <Calendar
      months={monthGrids(range[0], range[1], weekStart)}
      weekStart={weekStart}
      counts={counts}
      total={total}
      mine={mine}
      selectableDays={selectable}
      editable={editable}
      onChange={(next) => {
        setMine(next);
        onChange([...next].sort());
      }}
    />
  );
}

const focused = () => (document.activeElement as HTMLElement | null)?.dataset.date;
const press = (key: string) => fireEvent.keyDown(document.activeElement!, { key });

const cell = (c: Element, iso: string) => c.querySelector(`[data-date="${iso}"]`) as HTMLElement;

describe('Calendar', () => {
  it('renders tallies, range states, and the month structure', () => {
    const { container } = render(<Harness />);
    const d9 = cell(container, '2026-10-09');
    expect(d9.className).toContain('is-open');
    expect(d9.querySelector('.mark svg path')).toBeTruthy();
    expect(d9.querySelector('.mark .n')).toBeNull();
    expect(cell(container, '2026-10-10').querySelector('.mark')!.children).toHaveLength(0);
    expect(cell(container, '2026-10-07').className).toContain('is-past');
    expect(container.querySelectorAll('.day.is-out').length).toBe(31 - 14);
    expect(container.textContent).toContain('October 2026');
    const month = container.querySelector('.month')!;
    expect([...month.children].map((el) => (el.tagName === 'H3' ? 'h3' : el.className))).toEqual(['h3', 'dow-row', 'grid']);
  });

  it('shows numbers and shading for groups of 10 or more', () => {
    const { container, rerender } = render(<Harness total={9} counts={new Map([['2026-10-09', 5]])} />);
    expect(cell(container, '2026-10-09').querySelector('.mark svg')).toBeTruthy();
    expect(container.querySelector('.day.is-shaded')).toBeNull();
    expect(container.textContent).toContain('One mark per person free');
    rerender(<Harness total={10} counts={new Map([['2026-10-09', 5]])} />);
    const d9 = cell(container, '2026-10-09');
    expect(d9.querySelector('.mark .n')!.textContent).toBe('5');
    expect(d9.className).toContain('is-shaded');
    expect(d9.style.getPropertyValue('--share')).toBe('0.500');
    expect(container.querySelectorAll('.mark svg')).toHaveLength(0);
    expect(container.textContent).toContain('People free that day');
  });

  it('highlights only your days, and never past days', () => {
    const { container } = render(<Harness initial={['2026-10-10']} />);
    expect(cell(container, '2026-10-10').className).toContain('is-mine');
    expect(cell(container, '2026-10-11').className).not.toContain('is-mine');
    expect(cell(container, '2026-10-07').querySelector('.hl')).toBeTruthy(); // present but hidden by CSS on .is-past
  });

  it('drops "Tap to mark" from the legend in browse mode', () => {
    const { container, unmount } = render(<Harness />);
    expect(container.textContent).toContain('Tap to mark');
    unmount();
    const ro = render(<Harness editable={false} />);
    expect(ro.container.textContent).not.toContain('Tap to mark');
    expect(ro.container.textContent).toContain('Outside the dates');
  });

  it('plays the swipe on days you add, for 400ms each, including by keyboard', () => {
    vi.useFakeTimers();
    // act() flushes Preact's re-render after a timer changes state.
    const wait = (ms: number) => act(() => {
      vi.advanceTimersByTime(ms);
    });
    try {
      const { container } = render(<Harness />);
      fireEvent.pointerDown(cell(container, '2026-10-09'), { pointerType: 'mouse' });
      expect(cell(container, '2026-10-09').className).toContain('is-swiping');
      wait(300);
      fireEvent.pointerMove(cell(container, '2026-10-10'), { pointerType: 'mouse' });
      fireEvent.pointerUp(window);
      wait(150);
      expect(cell(container, '2026-10-09').className).not.toContain('is-swiping');
      expect(cell(container, '2026-10-10').className).toContain('is-swiping');
      wait(300);
      expect(cell(container, '2026-10-10').className).not.toContain('is-swiping');
      fireEvent.click(cell(container, '2026-10-12'), { detail: 0 });
      expect(cell(container, '2026-10-12').className).toContain('is-swiping');
      fireEvent.click(cell(container, '2026-10-12'), { detail: 0 }); // unmark: no new swipe
      wait(400);
      expect(container.querySelector('.is-swiping')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not swipe when your days change from outside (a poll or the saver)', () => {
    const props = { months: monthGrids('2026-10-07', '2026-10-20'), counts: new Map<string, number>(), total: 3, selectableDays: rangeDays('2026-10-09', '2026-10-20'), editable: true, onChange: () => {} };
    const { container, rerender } = render(<Calendar {...props} mine={new Set()} />);
    rerender(<Calendar {...props} mine={new Set(['2026-10-10'])} />);
    expect(cell(container, '2026-10-10').className).toContain('is-mine');
    expect(container.querySelector('.is-swiping')).toBeNull();
  });

  it('renders in-range days as labelled buttons', () => {
    const { container } = render(<Harness />);
    const d9 = cell(container, '2026-10-09');
    expect(d9.tagName).toBe('BUTTON');
    expect(d9.getAttribute('type')).toBe('button');
    expect(d9.getAttribute('aria-label')).toBe('Friday, October 9, 2 of 3 people free');
    expect(cell(container, '2026-10-10').getAttribute('aria-label')).toBe('Saturday, October 10, nobody free yet');
    expect(container.querySelector('.day.is-out')!.tagName).toBe('DIV');
    expect(container.querySelector('.day.is-out')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('marks pressed and unavailable days for screen readers', () => {
    const { container, unmount } = render(<Harness initial={['2026-10-08', '2026-10-10']} />);
    expect(cell(container, '2026-10-10').getAttribute('aria-pressed')).toBe('true');
    expect(cell(container, '2026-10-11').getAttribute('aria-pressed')).toBe('false');
    expect(cell(container, '2026-10-11').getAttribute('aria-disabled')).toBeNull();
    // A marked past day is still pressed, and unavailable
    expect(cell(container, '2026-10-08').getAttribute('aria-pressed')).toBe('true');
    expect(cell(container, '2026-10-08').getAttribute('aria-disabled')).toBe('true');
    unmount();
    const ro = render(<Harness editable={false} initial={['2026-10-10']} />);
    expect(cell(ro.container, '2026-10-10').getAttribute('aria-pressed')).toBeNull();
    expect(cell(ro.container, '2026-10-10').getAttribute('aria-disabled')).toBe('true');
  });

  it('has one Tab stop, on the first selectable day', () => {
    const { container } = render(<Harness />);
    const stops = container.querySelectorAll('[tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect((stops[0] as HTMLElement).dataset.date).toBe('2026-10-09');
  });

  it('keeps a Tab stop when every day is past', () => {
    const { container } = render(<Harness selectable={[]} />);
    const stops = container.querySelectorAll('[tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect((stops[0] as HTMLElement).dataset.date).toBe('2026-10-07');
  });

  it('moves focus by day and week with the arrow keys', () => {
    const { container } = render(<Harness />);
    act(() => cell(container, '2026-10-09').focus());
    press('ArrowRight');
    expect(focused()).toBe('2026-10-10');
    press('ArrowDown');
    expect(focused()).toBe('2026-10-17');
    press('ArrowUp');
    expect(focused()).toBe('2026-10-10');
    press('ArrowLeft');
    expect(focused()).toBe('2026-10-09');
    expect(cell(container, '2026-10-09').getAttribute('tabindex')).toBe('0');
    expect(cell(container, '2026-10-10').getAttribute('tabindex')).toBe('-1');
  });

  it('stops at the range edges and still blocks page scrolling', () => {
    const { container } = render(<Harness />);
    act(() => cell(container, '2026-10-20').focus());
    expect(press('ArrowDown')).toBe(false); // false = default prevented
    expect(focused()).toBe('2026-10-20');
    press('Home');
    expect(focused()).toBe('2026-10-07');
    press('ArrowUp');
    expect(focused()).toBe('2026-10-07');
    press('End');
    expect(focused()).toBe('2026-10-20');
  });

  it('moves across months', () => {
    const { container } = render(<Harness range={['2026-10-25', '2026-11-05']} selectable={rangeDays('2026-10-25', '2026-11-05')} />);
    act(() => cell(container, '2026-10-31').focus());
    press('ArrowRight');
    expect(focused()).toBe('2026-11-01');
    press('ArrowUp');
    expect(focused()).toBe('2026-10-25');
  });

  it('falls back to a Tab stop that exists when the range shrinks', () => {
    const { container, rerender } = render(<Harness range={['2026-10-07', '2026-10-20']} />);
    act(() => cell(container, '2026-10-20').focus());
    rerender(<Harness range={['2026-10-07', '2026-10-15']} />);
    const stops = container.querySelectorAll('[tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect((stops[0] as HTMLElement).dataset.date).toBe('2026-10-09');
  });

  it('leaves other keys and modified arrows alone', () => {
    const { container } = render(<Harness />);
    act(() => cell(container, '2026-10-09').focus());
    expect(press('a')).toBe(true);
    expect(fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft', altKey: true })).toBe(true);
    expect(focused()).toBe('2026-10-09');
  });

  it('starts the week on the given day', () => {
    const { container } = render(<Harness weekStart={1} />);
    expect(container.querySelector('.dow-row')!.textContent).toBe('MoTuWeThFrSaSu');
    const grid = container.querySelector('.grid')!;
    expect(grid.children[3].textContent).toBe('1'); // Oct 1 2026 is a Thursday
  });

  it('toggles a day on tap', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    fireEvent.pointerDown(cell(container, '2026-10-10'), { pointerType: 'mouse' });
    fireEvent.pointerUp(window);
    expect(onChange).toHaveBeenLastCalledWith(['2026-10-10']);
    expect(cell(container, '2026-10-10').className).toContain('is-mine');
    fireEvent.pointerDown(cell(container, '2026-10-10'), { pointerType: 'mouse' });
    fireEvent.pointerUp(window);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('drags a span across weeks', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    fireEvent.pointerDown(cell(container, '2026-10-09'), { pointerType: 'mouse' });
    fireEvent.pointerMove(cell(container, '2026-10-12'), { pointerType: 'mouse' });
    fireEvent.pointerUp(window);
    expect(onChange).toHaveBeenLastCalledWith(['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']);
  });

  it('a drag starting on a marked day removes', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness initial={['2026-10-10', '2026-10-11', '2026-10-15']} onChange={onChange} />);
    fireEvent.pointerDown(cell(container, '2026-10-10'), { pointerType: 'mouse' });
    fireEvent.pointerMove(cell(container, '2026-10-11'), { pointerType: 'mouse' });
    fireEvent.pointerUp(window);
    expect(onChange).toHaveBeenLastCalledWith(['2026-10-15']);
  });

  it('ignores past days and read-only mode', () => {
    const onChange = vi.fn();
    const { container, unmount } = render(<Harness onChange={onChange} />);
    fireEvent.pointerDown(cell(container, '2026-10-07'), { pointerType: 'mouse' });
    fireEvent.pointerUp(window);
    expect(onChange).not.toHaveBeenCalled();
    unmount();
    const ro = render(<Harness editable={false} onChange={onChange} />);
    fireEvent.pointerDown(cell(ro.container, '2026-10-10'), { pointerType: 'mouse' });
    fireEvent.pointerUp(window);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('toggles on a bare click, which is how keyboards and screen readers activate', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    fireEvent.click(cell(container, '2026-10-10'));
    expect(onChange).toHaveBeenLastCalledWith(['2026-10-10']);
    expect(cell(container, '2026-10-10').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(cell(container, '2026-10-10'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('ignores a bare click on past days and in read-only mode', () => {
    const onChange = vi.fn();
    const { container, unmount } = render(<Harness onChange={onChange} />);
    fireEvent.click(cell(container, '2026-10-07'));
    unmount();
    const ro = render(<Harness editable={false} onChange={onChange} />);
    fireEvent.click(cell(ro.container, '2026-10-10'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('toggles once for a mouse press and its click', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    const d10 = cell(container, '2026-10-10');
    fireEvent.pointerDown(d10, { pointerType: 'mouse' });
    fireEvent.pointerUp(window);
    fireEvent.click(d10, { detail: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(['2026-10-10']);
  });

  it('toggles once for a touch tap and its click', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    const d10 = cell(container, '2026-10-10');
    fireEvent.pointerDown(d10, { pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.pointerUp(window);
    fireEvent.click(d10, { detail: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(['2026-10-10']);
  });

  it('toggles once for a touch tap whose click arrives after a timer tick', async () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    const d10 = cell(container, '2026-10-10');
    fireEvent.pointerDown(d10, { pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.pointerUp(window);
    await new Promise((r) => setTimeout(r, 0));
    fireEvent.click(d10, { detail: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('a drag that ends without a click does not swallow a screen reader click', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    fireEvent.pointerDown(cell(container, '2026-10-09'), { pointerType: 'mouse' });
    fireEvent.pointerMove(cell(container, '2026-10-12'), { pointerType: 'mouse' });
    fireEvent.pointerUp(window);
    fireEvent.click(cell(container, '2026-10-15')); // detail 0, like a screen reader
    expect(onChange).toHaveBeenLastCalledWith(['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-15']);
  });

  it('a cancelled touch press does not block the next click', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    const d10 = cell(container, '2026-10-10');
    fireEvent.pointerDown(d10, { pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.pointerUp(window);
    fireEvent.pointerCancel(window);
    fireEvent.click(d10, { detail: 1 });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('focuses the day a drag ended on', () => {
    const { container } = render(<Harness />);
    fireEvent.pointerDown(cell(container, '2026-10-09'), { pointerType: 'mouse' });
    fireEvent.pointerMove(cell(container, '2026-10-12'), { pointerType: 'mouse' });
    fireEvent.pointerUp(window);
    expect(focused()).toBe('2026-10-12');
  });

  it('keeps focus on the last selectable day when a drag ends over a past day', () => {
    const { container } = render(<Harness />);
    fireEvent.pointerDown(cell(container, '2026-10-10'), { pointerType: 'mouse' });
    fireEvent.pointerMove(cell(container, '2026-10-09'), { pointerType: 'mouse' });
    fireEvent.pointerMove(cell(container, '2026-10-08'), { pointerType: 'mouse' });
    fireEvent.pointerUp(window);
    expect(focused()).toBe('2026-10-09');
  });

  it('does not let a held Enter repeat the toggle', () => {
    const { container } = render(<Harness />);
    act(() => cell(container, '2026-10-10').focus());
    expect(fireEvent.keyDown(cell(container, '2026-10-10'), { key: 'Enter', repeat: true })).toBe(false);
  });
});
