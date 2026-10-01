import type { EventInfo } from '../shared/types';

// The link preview card for /e/:id. The join sheet says the same thing: keep in sync with copy.join in src/copy.ts.
const GENERIC_TITLE = 'SocialCal: find the day that works for everyone';
const GENERIC_DESCRIPTION =
  'Make a calendar, share the link, and see which days work for the most people.';

export type PreviewTags = { title: string; description: string; image: string; url: string | null };

const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const WITH_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function formatRange(start: string, end: string): string {
  if (start === end) return `for ${SHORT.format(utc(start))}`;
  const fmt = start.slice(0, 4) === end.slice(0, 4) ? SHORT : WITH_YEAR;
  return `from ${fmt.format(utc(start))} – ${fmt.format(utc(end))}`;
}

export function previewTags(info: EventInfo | null, origin: string): PreviewTags {
  const image = `${origin}/og.png`;
  if (!info) return { title: GENERIC_TITLE, description: GENERIC_DESCRIPTION, image, url: null };
  return {
    title: `Help find a date for ${info.name}`,
    description: `${info.creatorName} wants to find a day that works. Add your availability ${formatRange(info.startDate, info.endDate)}.`,
    image,
    url: `${origin}/e/${info.id}`,
  };
}
