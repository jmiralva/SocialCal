import { describe, it, expect } from 'vitest';
import { firstError, isIsoDate, nameKey, validateDates, validateEventFields, validatePersonName } from './validate';

const valid = { name: 'Fall camping trip', description: '', startDate: '2026-10-07', endDate: '2026-11-14' };

describe('validateEventFields', () => {
  it('accepts a valid event', () => {
    expect(validateEventFields(valid)).toEqual({});
  });
  it('requires a name and caps its length', () => {
    expect(validateEventFields({ ...valid, name: '' }).name).toBe('Give the plan a name.');
    expect(validateEventFields({ ...valid, name: 'x'.repeat(81) }).name).toBe('Keep the name to 80 characters or fewer.');
    expect(validateEventFields({ ...valid, name: 'x'.repeat(80) }).name).toBeUndefined();
  });
  it('caps the description', () => {
    expect(validateEventFields({ ...valid, description: 'x'.repeat(501) }).description).toBe(
      'Keep the description to 500 characters or fewer.',
    );
  });
  it('requires valid dates in order', () => {
    expect(validateEventFields({ ...valid, startDate: '2026-02-30' }).startDate).toBe('Pick a start date.');
    expect(validateEventFields({ ...valid, endDate: '' }).endDate).toBe('Pick an end date.');
    expect(validateEventFields({ ...valid, endDate: '2026-10-06' }).endDate).toBe(
      'End date must be on or after the start date.',
    );
  });
  it('limits the range to 366 days', () => {
    expect(validateEventFields({ ...valid, startDate: '2026-01-01', endDate: '2027-01-01' }).endDate).toBeUndefined();
    expect(validateEventFields({ ...valid, startDate: '2026-01-01', endDate: '2027-01-02' }).endDate).toBe(
      'Date range can be at most 12 months.',
    );
  });
});

describe('validatePersonName', () => {
  it('requires 1-40 characters', () => {
    expect(validatePersonName('')).toBe('Enter your name.');
    expect(validatePersonName('x'.repeat(41))).toBe('Keep your name to 40 characters or fewer.');
    expect(validatePersonName('Maya')).toBeNull();
  });
});

describe('validateDates', () => {
  it('accepts a list of ISO dates', () => {
    expect(validateDates(['2026-10-07'])).toBeNull();
    expect(validateDates([])).toBeNull();
  });
  it('rejects bad input', () => {
    expect(validateDates('2026-10-07')).toBe('Dates must be a list.');
    expect(validateDates(['2026-13-01'])).toBe('Invalid date: 2026-13-01');
    expect(validateDates(Array(401).fill('2026-10-07'))).toBe('Too many dates.');
  });
});

describe('helpers', () => {
  it('isIsoDate checks real calendar dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate(20261007)).toBe(false);
  });
  it('firstError returns the first message', () => {
    expect(firstError({})).toBeUndefined();
    expect(firstError({ endDate: 'b', name: 'a' })).toBe('a');
  });
  it('nameKey trims and lowercases', () => {
    expect(nameKey('  Maya ')).toBe('maya');
  });
});
