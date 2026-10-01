import { describe, expect, it } from 'vitest';
import { copy } from './copy';

describe('copy.calendar.dayLabel', () => {
  it('says how many people are free', () => {
    expect(copy.calendar.dayLabel('Sunday, October 11', 1, 4)).toBe('Sunday, October 11, 1 of 4 people free');
    expect(copy.calendar.dayLabel('Sunday, October 11', 1, 1)).toBe('Sunday, October 11, 1 of 1 person free');
  });

  it('adds a best-day suffix only when asked', () => {
    expect(copy.calendar.dayLabel('Saturday, October 17', 7, 8, true)).toBe('Saturday, October 17, 7 of 8 people free, best day');
    expect(copy.calendar.dayLabel('Saturday, October 17', 7, 8, false)).toBe('Saturday, October 17, 7 of 8 people free');
    expect(copy.calendar.dayLabel('Saturday, October 17', 7, 8)).toBe('Saturday, October 17, 7 of 8 people free');
  });

  it('says nobody is free when the count or the total is zero', () => {
    expect(copy.calendar.dayLabel('Sunday, October 11', 0, 4)).toBe('Sunday, October 11, nobody free yet');
    expect(copy.calendar.dayLabel('Sunday, October 11', 0, 0)).toBe('Sunday, October 11, nobody free yet');
  });
});

describe('copy.join', () => {
  it('asks for help with the event, naming the creator', () => {
    expect(copy.join.title('Fall camping trip')).toBe('Help find a date for Fall camping trip');
    expect(copy.join.sub('Jorge')).toBe('Jorge wants to find a day that works. Enter your name and add your availability.');
  });
});
