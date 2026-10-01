import type { PreviewEnv } from './env';
import { ApiError } from './errors';
import { loadEvent, toEventInfo } from './events';
import type { EventInfo } from '../shared/types';

// The link preview card for /e/:id, generic wording first.
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

// The wording here mirrors the join sheet: keep in sync with copy.join in src/copy.ts.
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

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const meta = (attr: 'property' | 'name', key: string, value: string) =>
  `<meta ${attr}="${key}" content="${escapeAttr(value)}" />`;

// Replaces each preview tag with markup built here, so escaping doesn't depend on HTMLRewriter's setAttribute.
export function rewriteHtml(res: Response, tags: PreviewTags): Response {
  const swap = (attr: 'property' | 'name', key: string, value: string) => ({
    element(el: Element) {
      el.replace(meta(attr, key, value), { html: true });
    },
  });
  return new HTMLRewriter()
    .on('meta[property="og:title"]', swap('property', 'og:title', tags.title))
    .on('meta[property="og:description"]', swap('property', 'og:description', tags.description))
    .on('meta[name="description"]', swap('name', 'description', tags.description))
    .on('meta[property="og:image"]', swap('property', 'og:image', tags.image))
    .on('head', {
      element(el) {
        if (tags.url) el.append(meta('property', 'og:url', tags.url), { html: true });
      },
    })
    .transform(res);
}

const EVENT_PATH = /^\/e\/([A-Za-z0-9]{22})\/?$/;

async function findEvent(env: PreviewEnv, path: string): Promise<EventInfo | null> {
  const id = EVENT_PATH.exec(path)?.[1];
  if (!id) return null;
  try {
    return toEventInfo(await loadEvent(env, id));
  } catch (e) {
    if (!(e instanceof ApiError)) console.error(e);
    return null;
  }
}

// GET /e/:id. A failed lookup serves the page with the generic card; the app shows its own Not Found.
// A failed asset fetch is passed through, or throws and the Function falls through to the static page.
export async function handlePreview(request: Request, env: PreviewEnv): Promise<Response> {
  const url = new URL(request.url);
  // A fresh request, never the browser's: a forwarded If-None-Match could come back as a bodyless 304.
  // Not /index.html, which Pages redirects to /.
  const [info, page] = await Promise.all([findEvent(env, url.pathname), env.ASSETS.fetch(new URL('/', url))]);
  if (!page.ok) return page;
  const tags = previewTags(info, url.origin);
  return new Response(rewriteHtml(page, tags).body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      // public/_headers doesn't apply to Function responses.
      'X-Robots-Tag': 'noindex',
    },
  });
}
