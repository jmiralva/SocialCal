import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSaver, type SaverStatus } from './saver';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createSaver', () => {
  it('debounces to the latest value', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const statuses: SaverStatus[] = [];
    const saver = createSaver({ save, onStatus: (s) => statuses.push(s) });
    saver.schedule(['a']);
    saver.schedule(['a', 'b']);
    await vi.advanceTimersByTimeAsync(499);
    expect(save).not.toHaveBeenCalled();
    expect(saver.hasPending()).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(['a', 'b']);
    expect(statuses).toEqual(['saving', 'idle']);
    expect(saver.hasPending()).toBe(false);
  });

  it('retries with backoff until it succeeds', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const statuses: SaverStatus[] = [];
    const saver = createSaver({ save, onStatus: (s) => statuses.push(s) });
    saver.schedule(['a']);
    await vi.advanceTimersByTimeAsync(500);
    expect(statuses.at(-1)).toBe('retrying');
    await vi.advanceTimersByTimeAsync(1999);
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe('idle');
  });

  it('sends changes made while a save is in flight', async () => {
    let resolveFirst!: () => void;
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((r) => (resolveFirst = r)))
      .mockResolvedValue(undefined);
    const saver = createSaver({ save, onStatus: () => {} });
    saver.schedule(['a']);
    await vi.advanceTimersByTimeAsync(500);
    saver.schedule(['a', 'b']);
    resolveFirst();
    await vi.advanceTimersByTimeAsync(600);
    expect(save).toHaveBeenLastCalledWith(['a', 'b']);
    expect(saver.hasPending()).toBe(false);
  });

  it('flush sends immediately, and dispose flushes without retrying', async () => {
    const save = vi.fn().mockRejectedValue(new Error('offline'));
    const saver = createSaver({ save, onStatus: () => {} });
    saver.schedule(['a']);
    saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(0);
    saver.schedule(['a', 'b']); // queued behind the pending retry
    saver.dispose();
    expect(save).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(save).toHaveBeenCalledTimes(2);
  });
});
