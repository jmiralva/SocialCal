import { render } from '@testing-library/preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNewBestDays } from './useNewBestDays';

let seen: ReadonlySet<string> = new Set();
function Probe({ best }: { best: string[] | null }) {
  seen = useNewBestDays(best);
  return null;
}
const ids = () => [...seen].sort();

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useNewBestDays', () => {
  it('animates nothing while loading or on the first ready render', () => {
    const { rerender } = render(<Probe best={null} />);
    expect(ids()).toEqual([]);
    rerender(<Probe best={['2026-10-17']} />);
    expect(ids()).toEqual([]);
  });

  it('returns days that join the set, and holds them through unrelated re-renders', () => {
    const { rerender } = render(<Probe best={['2026-10-17']} />);
    rerender(<Probe best={['2026-10-17', '2026-10-24']} />);
    expect(ids()).toEqual(['2026-10-24']);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender(<Probe best={['2026-10-17', '2026-10-24']} />); // e.g. the saver's "saving" status
    expect(ids()).toEqual(['2026-10-24']);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(ids()).toEqual([]);
  });

  it('ignores re-renders with the same set and a set that only shrinks', () => {
    const { rerender } = render(<Probe best={['2026-10-17', '2026-10-24']} />);
    rerender(<Probe best={['2026-10-24', '2026-10-17']} />);
    expect(ids()).toEqual([]);
    rerender(<Probe best={[]} />);
    expect(ids()).toEqual([]);
  });

  it('keeps an earlier day drawing when another joins inside the hold', () => {
    const { rerender } = render(<Probe best={['a']} />);
    rerender(<Probe best={['a', 'b']} />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender(<Probe best={['a', 'b', 'c']} />);
    expect(ids()).toEqual(['b', 'c']);
  });
});
