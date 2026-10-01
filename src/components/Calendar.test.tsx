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
  onChange = () => {},
}: {
  initial?: string[];
  editable?: boolean;
  weekStart?: number;
  range?: [string, string];
  selectable?: string[];
  onChange?: (d: string[]) => void;
}) {
  const [mine, setMine] = useState(new Set(initial));
  return (
    <Calendar
      months={monthGrids(range[0], range[1], weekStart)}
      weekStart={weekStart}
      counts={new Map([['2026-10-09', 2]])}
      total={3}
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
  it('renders counts, levels, and range states', () => {
    const { container } = render(<Harness />);
    const d9 = cell(container, '2026-10-09');
    expect(d9.textContent).toContain('2/3');
    expect(d9.className).toContain('lvl-3');
    expect(cell(container, '2026-10-07').className).toContain('is-past');
    expect(container.querySelectorAll('.day.is-out').length).toBe(31 - 14);
    expect(container.textContent).toContain('October 2026');
    // Each month: heading, then weekday row, then grid
    const month = container.querySelector('.month')!;
    expect([...month.children].map((el) => el.tagName === 'H3' ? 'h3' : el.className)).toEqual(['h3', 'dow-row', 'grid']);
  });

  it('renders in-range days as labelled buttons', () => {
    const { container } = render(<Harness />);
    const d9 = cell(container, '2026-10-09');
    expect(d9.tagName).toBe('BUTTON');
    expect(d9.getAttribute('type')).toBe('button');
    expect(d9.getAttribute('aria-label')).toBe('Friday, October 9, 2 of 3 people free');
    expect(cell(container, '2026-10-10').getAttribute('aria-label')).toBe('Saturday, October 10, nobody free yet');
    expect(container.querySelector('.day.is-out')!.tagName).toBe('DIV');
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
    expect(container.querySelector('.dow-row')!.textContent).toBe('MTWTFSS');
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
});
