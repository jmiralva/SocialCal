import { describe, expect, it } from 'vitest';
import { copy } from './copy';

describe('copy.calendar.dayLabel', () => {
  it('says how many people are free', () => {
    expect(copy.calendar.dayLabel('Sunday, October 11', 1, 4)).toBe('Sunday, October 11, 1 of 4 people free');
    expect(copy.calendar.dayLabel('Sunday, October 11', 1, 1)).toBe('Sunday, October 11, 1 of 1 person free');
  });

  it('says nobody is free when the count or the total is zero', () => {
    expect(copy.calendar.dayLabel('Sunday, October 11', 0, 4)).toBe('Sunday, October 11, nobody free yet');
    expect(copy.calendar.dayLabel('Sunday, October 11', 0, 0)).toBe('Sunday, October 11, nobody free yet');
  });
});
