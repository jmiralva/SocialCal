import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { handleApi } from './router';
import type { CreateEventResult, EventInfo, EventPayload, JoinResult, Participant } from '../shared/types';

const call = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  handleApi(
    new Request(`https://test.local${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );

const validEvent = {
  name: 'Fall camping trip',
  description: 'Two nights',
  startDate: '2026-10-07',
  endDate: '2026-11-14',
  creatorName: 'Jorge',
};

async function create(overrides: Record<string, unknown> = {}) {
  const res = await call('POST', '/api/events', { ...validEvent, ...overrides });
  expect(res.status).toBe(201);
  return (await res.json()) as CreateEventResult;
}

describe('POST /api/events', () => {
  it('creates an event with the creator as first participant', async () => {
    const created = await create();
    for (const v of [created.eventId, created.editKey, created.participantId, created.token]) {
      expect(v).toMatch(/^[A-Za-z0-9]{22}$/);
    }
    const res = await call('GET', `/api/events/${created.eventId}`);
    expect(res.status).toBe(200);
    const payload = (await res.json()) as EventPayload;
    expect(payload.event).toEqual({
      id: created.eventId,
      name: 'Fall camping trip',
      description: 'Two nights',
      startDate: '2026-10-07',
      endDate: '2026-11-14',
      creatorName: 'Jorge',
      creatorParticipantId: created.participantId,
    });
    expect(payload.participants).toEqual([{ id: created.participantId, name: 'Jorge', dates: [] }]);
  });

  it('trims input and rejects invalid fields', async () => {
    const res = await call('POST', '/api/events', { ...validEvent, name: '   ' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'invalid', message: 'Give the plan a name.' } });
    const tooLong = await call('POST', '/api/events', { ...validEvent, startDate: '2026-01-01', endDate: '2027-01-02' });
    expect(tooLong.status).toBe(400);
    const noName = await call('POST', '/api/events', { ...validEvent, creatorName: '' });
    expect(((await noName.json()) as { error: { message: string } }).error.message).toBe('Enter your name.');
  });

  it('rejects a non-object body', async () => {
    const res = await handleApi(new Request('https://test.local/api/events', { method: 'POST', body: 'nope' }), env);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('bad_json');
  });
});

describe('GET /api/events/:id', () => {
  it('404s for unknown ids', async () => {
    const res = await call('GET', '/api/events/AAAAAAAAAAAAAAAAAAAAAA');
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('event_not_found');
  });

  it('never returns secrets or hashes', async () => {
    const created = await create();
    const text = await (await call('GET', `/api/events/${created.eventId}`)).text();
    expect(text).not.toContain('hash');
    expect(text).not.toContain(created.editKey);
    expect(text).not.toContain(created.token);
  });

  it('sets no-store caching', async () => {
    const created = await create();
    const res = await call('GET', `/api/events/${created.eventId}`);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('routing', () => {
  it('404s unknown routes', async () => {
    expect((await call('GET', '/api/nope')).status).toBe(404);
    expect((await call('DELETE', '/api/events/abc')).status).toBe(404);
  });
});
