import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleApi } from './router';
import { formatRange, handlePreview, previewTags, rewriteHtml, type PreviewTags } from './preview';
import type { CreateEventResult, EventInfo } from '../shared/types';

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

// Hand-written subset of index.html's <head>: keep the preview tags in sync with index.html.
// The e2e test checks the real, built index.html.
const FIXTURE = `<!doctype html>
<html lang="en">
  <head>
    <title>SocialCal</title>
    <meta name="description" content="Generic description" />
    <meta property="og:title" content="SocialCal: find the day that works for everyone" />
    <meta property="og:description" content="Generic description" />
    <meta property="og:image" content="https://socialcal-arx.pages.dev/og.png" />
  </head>
  <body><div id="app"></div></body>
</html>`;

const tags = (over: Partial<PreviewTags> = {}): PreviewTags => ({
  title: 'Help find a date for Fall camping trip',
  description: 'Jorge wants to find a day that works. Add your availability from Oct 10 – Nov 2.',
  image: 'https://socialcal.test/og.png',
  url: `https://socialcal.test/e/${'E'.repeat(22)}`,
  ...over,
});

const rewrite = (t: PreviewTags) => rewriteHtml(new Response(FIXTURE), t).text();

describe('rewriteHtml', () => {
  it('replaces the preview tags and adds og:url', async () => {
    const html = await rewrite(tags());
    expect(html).toContain('<meta property="og:title" content="Help find a date for Fall camping trip" />');
    expect(html).toContain(
      '<meta property="og:description" content="Jorge wants to find a day that works. Add your availability from Oct 10 – Nov 2." />',
    );
    expect(html).toContain(
      '<meta name="description" content="Jorge wants to find a day that works. Add your availability from Oct 10 – Nov 2." />',
    );
    expect(html).toContain('<meta property="og:image" content="https://socialcal.test/og.png" />');
    expect(html).toContain(`<meta property="og:url" content="https://socialcal.test/e/${'E'.repeat(22)}" /></head>`);
    expect(html).toContain('<title>SocialCal</title>');
    expect(html).not.toContain('Generic description');
  });

  it('adds no og:url to the generic card', async () => {
    expect(await rewrite(tags({ url: null }))).not.toContain('og:url');
  });

  it('escapes names so the card shows them exactly as typed', async () => {
    const quote = await rewrite(tags({ title: 'Help find a date for "><script>alert(1)</script>' }));
    expect(quote).toContain('content="Help find a date for &quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
    expect(quote).not.toContain('<script>');

    const amp = await rewrite(tags({ title: 'Help find a date for Tom & Jerry' }));
    expect(amp).toContain('content="Help find a date for Tom &amp; Jerry"');

    const entity = await rewrite(tags({ title: 'Help find a date for A &lt; B' }));
    expect(entity).toContain('content="Help find a date for A &amp;lt; B"');
  });
});

describe('handlePreview', () => {
  // Behaves like Pages' asset server: a forwarded If-None-Match gets a bodyless 304.
  const assets = {
    fetch: vi.fn(async (input: URL | Request) =>
      input instanceof Request && input.headers.has('If-None-Match')
        ? new Response(null, { status: 304 })
        : new Response(FIXTURE, { headers: { ETag: '"abc"' } }),
    ),
  };
  const throwingDb = (prepare: () => never) => ({ prepare }) as unknown as D1Database;

  afterEach(() => {
    assets.fetch.mockClear();
    vi.restoreAllMocks();
  });

  async function createEvent(): Promise<string> {
    const res = await handleApi(
      new Request('https://test.local/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Fall camping trip',
          description: 'Two nights',
          startDate: '2026-10-10',
          endDate: '2026-11-02',
          creatorName: 'Jorge',
        }),
      }),
      env,
    );
    return ((await res.json()) as CreateEventResult).eventId;
  }

  const get = (path: string, headers: Record<string, string> = {}) =>
    handlePreview(new Request(`https://socialcal.test${path}`, { headers }), { ...env, ASSETS: assets });

  it('serves the event card with fresh headers', async () => {
    const id = await createEvent();
    const res = await get(`/e/${id}?utm_source=x`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(res.headers.get('ETag')).toBeNull();
    const html = await res.text();
    expect(html).toContain('<meta property="og:title" content="Help find a date for Fall camping trip" />');
    expect(html).toContain(`<meta property="og:url" content="https://socialcal.test/e/${id}" />`);
    expect(html).toContain('<meta property="og:image" content="https://socialcal.test/og.png" />');
    expect(String(assets.fetch.mock.calls[0][0])).toBe('https://socialcal.test/');
  });

  it('accepts a trailing slash', async () => {
    const id = await createEvent();
    expect(await (await get(`/e/${id}/`)).text()).toContain('Help find a date for Fall camping trip');
  });

  it('never forwards the browser request, so revalidation still gets a full page', async () => {
    const id = await createEvent();
    const res = await get(`/e/${id}`, { 'If-None-Match': '"abc"' });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Help find a date for Fall camping trip');
    const sent = assets.fetch.mock.calls[0][0];
    expect(sent).toBeInstanceOf(URL);
  });

  it('serves the generic card for an unknown event, with the image on the request origin', async () => {
    const res = await get(`/e/${'Z'.repeat(22)}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
    const html = await res.text();
    expect(html).toContain('<meta property="og:title" content="SocialCal: find the day that works for everyone" />');
    expect(html).toContain('<meta property="og:image" content="https://socialcal.test/og.png" />');
    expect(html).not.toContain('og:url');
  });

  it('skips the database for a malformed ID', async () => {
    const prepare = vi.fn(() => {
      throw new Error('should not query');
    });
    const res = await handlePreview(new Request('https://socialcal.test/e/not-an-id'), {
      ...env,
      DB: throwingDb(prepare as () => never),
      ASSETS: assets,
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<meta property="og:title" content="SocialCal: find the day that works for everyone" />');
    expect(prepare).not.toHaveBeenCalled();
  });

  it('serves the generic card and logs when the database fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await handlePreview(new Request(`https://socialcal.test/e/${'Z'.repeat(22)}`), {
      ...env,
      DB: throwingDb(() => {
        throw new Error('D1 down');
      }),
      ASSETS: assets,
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<meta property="og:title" content="SocialCal: find the day that works for everyone" />');
    expect(log).toHaveBeenCalledOnce();
  });

  it('does not log a missing event', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await get(`/e/${'Z'.repeat(22)}`);
    expect(log).not.toHaveBeenCalled();
  });
});
