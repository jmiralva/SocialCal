import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiRequestError } from './api';

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
  it('sends JSON with auth headers', async () => {
    const fetchMock = respond(200, { id: 'p', name: 'Maya', dates: ['2026-10-09'] });
    vi.stubGlobal('fetch', fetchMock);
    const result = await api.updatePerson('E', 'P', 'TOKEN', { dates: ['2026-10-09'] });
    expect(result.name).toBe('Maya');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/events/E/people/P');
    expect(init.method).toBe('PATCH');
    expect(init.headers['X-Participant-Token']).toBe('TOKEN');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ dates: ['2026-10-09'] });
  });

  it('maps API errors', async () => {
    vi.stubGlobal('fetch', respond(409, { error: { code: 'name_taken', message: 'Someone named Maya already joined.' } }));
    const err = await api.join('E', 'Maya').catch((e) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err.status).toBe(409);
    expect(err.code).toBe('name_taken');
    expect(err.message).toBe('Someone named Maya already joined.');
  });

  it('maps network failures to status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await api.getEvent('E').catch((e) => e);
    expect(err.status).toBe(0);
    expect(err.code).toBe('network');
  });
});
