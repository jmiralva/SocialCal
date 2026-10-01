import { fireEvent, render } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { describe, expect, it, vi } from 'vitest';
import { Calendar } from './Calendar';
import { monthGrids, rangeDays } from '../../shared/dates';

function Harness({ initial = [], editable = true, onChange = () => {} }: { initial?: string[]; editable?: boolean; onChange?: (d: string[]) => void }) {
  const [mine, setMine] = useState(new Set(initial));
  return (
    <Calendar
      months={monthGrids('2026-10-07', '2026-10-20')}
      counts={new Map([['2026-10-09', 2]])}
      total={3}
      mine={mine}
      selectableDays={rangeDays('2026-10-09', '2026-10-20')} // Oct 7-8 are "past"
      editable={editable}
      onChange={(next) => {
        setMine(next);
        onChange([...next].sort());
      }}
    />
  );
}

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
