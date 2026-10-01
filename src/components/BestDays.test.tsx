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
  it('styles the share button as primary', () => {
    renderBest({ kind: 'not-enough-people' });
    expect(screen.getByRole('button', { name: 'Share the link' }).className).toBe('btn');
  });

  it('styles the no-majority share button as primary for non-creators', () => {
    renderBest({ kind: 'no-majority', max: 1, total: 4, closest: [] });
    expect(screen.getByRole('button', { name: 'Share the link' }).className).toBe('btn');
  });

  it('uses singular labels and the shared subtitle for one day', () => {
    renderBest({ kind: 'ok', total: 4, top: [score('2026-11-07', ['j', 'm', 's'])], next: [score('2026-10-09', ['m', 's'])] });
    expect(screen.getByRole('heading', { level: 2, name: 'Best day' })).toBeTruthy();
    expect(screen.getByText('3 of 4 people available')).toBeTruthy();
    expect(screen.getByText('Sat, Nov 7')).toBeTruthy();
    expect(screen.getByText('3 of 4')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'See 1 other day' }));
    expect(screen.getByRole('heading', { level: 3, name: 'Next best day' })).toBeTruthy();
    expect(screen.getByText('Fri, Oct 9')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hide other days' })).toBeTruthy();
  });

  it('uses plural labels, circles every tied day, and marks you and who is not free', () => {
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
        newBestDays={new Set(['2026-10-24'])}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Best days' })).toBeTruthy();
    expect(screen.getByText('3 of 4 people available')).toBeTruthy();
    const top = container.querySelectorAll('ol li.day-row.is-top');
    expect(top).toHaveLength(2);
    expect(top[0].querySelector('.ring')).toBeTruthy();
    expect(top[0].querySelector('.ring.draw')).toBeNull();
    expect(top[1].querySelector('.ring.draw')).toBeTruthy();
    expect(top[0].querySelector('.name.is-me')!.textContent).toBe('You');
    expect(top[1].querySelector('.name.is-no s')!.textContent).toBe('You');
    expect(top[1].textContent).toContain('You (not free)');
    expect(container.querySelector('.meter')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'See 2 other days' }));
    expect(screen.getByRole('heading', { level: 3, name: 'Next best days' })).toBeTruthy();
    expect(container.querySelectorAll('li.day-row.is-secondary .ring')).toHaveLength(0);
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
    fireEvent.click(screen.getByRole('button', { name: 'Edit date range' }));
    expect(onEditDates).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Show closest days anyway' }));
    expect(screen.getByRole('heading', { level: 3, name: 'Closest day so far' })).toBeTruthy();
    expect(document.querySelectorAll('li.day-row.is-secondary')).toHaveLength(1);
  });

  it('no-majority copy for friends offers sharing', () => {
    renderBest({ kind: 'no-majority', max: 1, total: 4, closest: [score('2026-10-09', ['m'])] });
    expect(screen.queryByText(/widen the date range/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Share the link' })).toBeTruthy();
  });
});
