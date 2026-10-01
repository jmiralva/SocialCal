import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent } from '@testing-library/preact';
import { trackInputModality } from './inputModality';

describe('trackInputModality', () => {
  let stop = () => {};
  afterEach(() => {
    stop();
    stop = () => {};
    delete document.documentElement.dataset.input;
  });

  it('records whether the last input was a key or a pointer', () => {
    stop = trackInputModality();
    expect(document.documentElement.dataset.input).toBeUndefined();
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(document.documentElement.dataset.input).toBe('keyboard');
    fireEvent.pointerDown(document.body);
    expect(document.documentElement.dataset.input).toBe('pointer');
  });

  it('stops tracking when cleaned up', () => {
    trackInputModality()();
    fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(document.documentElement.dataset.input).toBeUndefined();
  });

  it('ignores modifier keys and shortcuts after a pointer press', () => {
    stop = trackInputModality();
    fireEvent.pointerDown(document.body);
    fireEvent.keyDown(document.body, { key: 'Shift' });
    expect(document.documentElement.dataset.input).toBe('pointer');
    fireEvent.keyDown(document.body, { key: 'c', metaKey: true });
    expect(document.documentElement.dataset.input).toBe('pointer');
  });

  it('counts Shift+Tab as keyboard', () => {
    stop = trackInputModality();
    fireEvent.pointerDown(document.body);
    fireEvent.keyDown(document.body, { key: 'Tab', shiftKey: true });
    expect(document.documentElement.dataset.input).toBe('keyboard');
  });
});
