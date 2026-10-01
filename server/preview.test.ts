import { describe, expect, it } from 'vitest';
import { formatRange, previewTags } from './preview';
import type { EventInfo } from '../shared/types';

const info: EventInfo = {
  id: 'E'.repeat(22),
  name: 'Fall camping trip',
  description: 'Two nights',
  startDate: '2026-10-10',
  endDate: '2026-11-02',
  creatorName: 'Jorge',
  creatorParticipantId: 'J'.repeat(22),
};

describe('formatRange', () => {
  it('shows month and day when both dates are in the same year', () => {
    expect(formatRange('2026-10-10', '2026-11-02')).toBe('from Oct 10 – Nov 2');
  });

  it('adds years when the range crosses a year', () => {
    expect(formatRange('2026-12-20', '2027-01-04')).toBe('from Dec 20, 2026 – Jan 4, 2027');
  });

  it('names one day when start and end match', () => {
    expect(formatRange('2026-10-10', '2026-10-10')).toBe('for Oct 10');
  });
});

describe('previewTags', () => {
  it('describes the event, who is asking, and the dates', () => {
    expect(previewTags(info, 'https://socialcal.test')).toEqual({
      title: 'Help find a date for Fall camping trip',
      description: 'Jorge wants to find a day that works. Add your availability from Oct 10 – Nov 2.',
      image: 'https://socialcal.test/og.png',
      url: `https://socialcal.test/e/${'E'.repeat(22)}`,
    });
  });

  it('falls back to the generic card, with the image on the request origin', () => {
    expect(previewTags(null, 'https://preview.socialcal.test')).toEqual({
      title: 'SocialCal: find the day that works for everyone',
      description: 'Make a calendar, share the link, and see which days work for the most people.',
      image: 'https://preview.socialcal.test/og.png',
      url: null,
    });
  });
});
