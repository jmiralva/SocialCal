import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { BestDays } from './BestDays';
import type { BestResult } from '../lib/best';
import type { Participant } from '../../shared/types';

const people: Participant[] = [
  { id: 'j', name: 'Jorge', dates: [] },
  { id: 'm', name: 'Maya', dates: [] },
  { id: 's', name: 'Sam', dates: [] },
  { id: 'p', name: 'Priya', dates: [] },
];
const score = (date: string, available: string[]) => ({ date, count: available.length, available });
const renderBest = (result: BestResult, isCreator = false) => {
  const onShare = vi.fn();
  const onEditDates = vi.fn();
  render(<BestDays result={result} participants={people} meId="j" isCreator={isCreator} onShare={onShare} onEditDates={onEditDates} />);
  return { onShare, onEditDates };
};

describe('BestDays', () => {
  it('uses singular labels for one day each', () => {
    renderBest({ kind: 'ok', total: 4, top: [score('2026-11-07', ['j', 'm', 's'])], next: [score('2026-10-09', ['m', 's'])] });
    expect(screen.getByText('Best day')).toBeTruthy();
    expect(screen.getByText('Sat, Nov 7')).toBeTruthy();
    expect(screen.getByText('3 of 4')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'See 1 other day' }));
    expect(screen.getByText('Next best day')).toBeTruthy();
    expect(screen.getByText('Fri, Oct 9')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hide other days' })).toBeTruthy();
  });

  it('uses plural labels and highlights top cards', () => {
    const { container } = render(
      <BestDays
        result={{
          kind: 'ok',
          total: 4,
          top: [score('2026-10-17', ['j', 'm', 'p']), score('2026-10-24', ['m', 's', 'p'])],
          next: [score('2026-10-09', ['m', 's']), score('2026-10-10', ['j', 'm'])],
        }}
        participants={people}
        meId="j"
        isCreator={false}
        onShare={() => {}}
        onEditDates={() => {}}
      />,
    );
    expect(screen.getByText('Best days')).toBeTruthy();
    expect(container.querySelectorAll('.day-card.is-top')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'See 2 other days' }));
    expect(screen.getByText('Next best days')).toBeTruthy();
    expect(container.querySelector('.pill.is-me')?.textContent).toBe('Jorge');
    expect(container.querySelector('.pill.is-no')).toBeTruthy();
  });

  it('notes when no other day reaches half', () => {
    renderBest({ kind: 'ok', total: 4, top: [score('2026-11-07', ['j', 'm', 's'])], next: [] });
    expect(screen.getByText('No other days work for at least half the group.')).toBeTruthy();
  });

  it('shows the not-enough-people state', () => {
    const { onShare } = renderBest({ kind: 'not-enough-people' });
    expect(screen.getByText('Nobody else yet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Share the link' }));
    expect(onShare).toHaveBeenCalled();
  });

  it('no-majority copy differs for the creator', () => {
    const result: BestResult = { kind: 'no-majority', max: 1, total: 4, closest: [score('2026-10-09', ['m'])] };
    const { onEditDates } = renderBest(result, true);
    expect(screen.getByText(/widen the date range/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit dates' }));
    expect(onEditDates).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Show closest days anyway' }));
    expect(screen.getByText('Closest day so far')).toBeTruthy();
  });

  it('no-majority copy for friends offers sharing', () => {
    renderBest({ kind: 'no-majority', max: 1, total: 4, closest: [score('2026-10-09', ['m'])] });
    expect(screen.queryByText(/widen the date range/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Share the link' })).toBeTruthy();
  });
});
