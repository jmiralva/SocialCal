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

describe('PATCH /api/events/:id', () => {
  it('requires the edit key', async () => {
    const { eventId } = await create();
    expect((await call('PATCH', `/api/events/${eventId}`, { name: 'x' })).status).toBe(401);
    expect((await call('PATCH', `/api/events/${eventId}`, { name: 'x' }, { 'X-Edit-Key': 'B'.repeat(22) })).status).toBe(403);
  });

  it('updates fields and keeps out-of-range dates stored', async () => {
    const { eventId, editKey, participantId, token } = await create();
    await call('PATCH', `/api/events/${eventId}/people/${participantId}`, { dates: ['2026-11-10'] }, { 'X-Participant-Token': token });
    const res = await call(
      'PATCH',
      `/api/events/${eventId}`,
      { name: 'New name', endDate: '2026-10-31' },
      { 'X-Edit-Key': editKey },
    );
    expect(res.status).toBe(200);
    const { event } = (await res.json()) as { event: EventInfo };
    expect(event.name).toBe('New name');
    expect(event.endDate).toBe('2026-10-31');
    expect(event.startDate).toBe('2026-10-07');
    const payload = (await (await call('GET', `/api/events/${eventId}`)).json()) as { participants: Participant[] };
    expect(payload.participants[0].dates).toEqual(['2026-11-10']);
  });

  it('validates the merged result', async () => {
    const { eventId, editKey } = await create();
    const res = await call('PATCH', `/api/events/${eventId}`, { endDate: '2026-10-01' }, { 'X-Edit-Key': editKey });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/events/:id/claim-creator', () => {
  it('rotates the creator token', async () => {
    const { eventId, editKey, participantId, token } = await create();
    const res = await call('POST', `/api/events/${eventId}/claim-creator`, undefined, { 'X-Edit-Key': editKey });
    expect(res.status).toBe(200);
    const claimed = (await res.json()) as JoinResult;
    expect(claimed.participantId).toBe(participantId);
    expect(claimed.token).not.toBe(token);
    const old = await call('PATCH', `/api/events/${eventId}/people/${participantId}`, { dates: [] }, { 'X-Participant-Token': token });
    expect(old.status).toBe(403);
    const fresh = await call('PATCH', `/api/events/${eventId}/people/${participantId}`, { dates: [] }, { 'X-Participant-Token': claimed.token });
    expect(fresh.status).toBe(200);
  });

  it('rejects a wrong edit key', async () => {
    const { eventId } = await create();
    expect((await call('POST', `/api/events/${eventId}/claim-creator`, undefined, { 'X-Edit-Key': 'C'.repeat(22) })).status).toBe(403);
  });
});

describe('people', () => {
  it('joins, then saves dates with the token', async () => {
    const { eventId } = await create();
    const joinRes = await call('POST', `/api/events/${eventId}/people`, { name: '  Maya ' });
    expect(joinRes.status).toBe(201);
    const maya = (await joinRes.json()) as JoinResult;
    const res = await call(
      'PATCH',
      `/api/events/${eventId}/people/${maya.participantId}`,
      { dates: ['2026-10-10', '2026-10-09', '2026-10-10'] },
      { 'X-Participant-Token': maya.token },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: maya.participantId, name: 'Maya', dates: ['2026-10-09', '2026-10-10'] });
  });

  it('rejects duplicate names case-insensitively', async () => {
    const { eventId } = await create();
    const res = await call('POST', `/api/events/${eventId}/people`, { name: 'jorge' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: 'name_taken', message: 'Someone named jorge already joined. Try adding a last initial.' },
    });
  });

  it('requires a matching token to change a person', async () => {
    const { eventId, participantId } = await create();
    const path = `/api/events/${eventId}/people/${participantId}`;
    expect((await call('PATCH', path, { dates: [] })).status).toBe(401);
    expect((await call('PATCH', path, { dates: [] }, { 'X-Participant-Token': 'D'.repeat(22) })).status).toBe(403);
  });

  it('renames, allowing a case change but not a clash', async () => {
    const { eventId, participantId, token } = await create();
    const maya = (await (await call('POST', `/api/events/${eventId}/people`, { name: 'Maya' })).json()) as JoinResult;
    const path = `/api/events/${eventId}/people/${participantId}`;
    expect((await call('PATCH', path, { name: 'JORGE' }, { 'X-Participant-Token': token })).status).toBe(200);
    const clash = await call('PATCH', path, { name: 'maya' }, { 'X-Participant-Token': token });
    expect(clash.status).toBe(409);
    const payload = (await (await call('GET', `/api/events/${eventId}`)).json()) as EventPayload;
    expect(payload.event.creatorName).toBe('JORGE');
    expect(payload.participants.map((p) => p.id)).toEqual([participantId, maya.participantId]);
  });

  it('validates names and dates', async () => {
    const { eventId, participantId, token } = await create();
    expect((await call('POST', `/api/events/${eventId}/people`, { name: '' })).status).toBe(400);
    expect((await call('POST', `/api/events/${eventId}/people`, { name: 'x'.repeat(41) })).status).toBe(400);
    const rename = await call('PATCH', `/api/events/${eventId}/people/${participantId}`, { name: 'x'.repeat(41) }, { 'X-Participant-Token': token });
    expect(rename.status).toBe(400);
    expect((await call('POST', '/api/events', { ...validEvent, name: 'x'.repeat(81) })).status).toBe(400);
    const bad = await call('PATCH', `/api/events/${eventId}/people/${participantId}`, { dates: ['2026-02-30'] }, { 'X-Participant-Token': token });
    expect(bad.status).toBe(400);
  });

  it('404s for a person from another event', async () => {
    const a = await create();
    const b = await create();
    const res = await call('PATCH', `/api/events/${b.eventId}/people/${a.participantId}`, { dates: [] }, { 'X-Participant-Token': a.token });
    expect(res.status).toBe(404);
  });

  it('caps an event at 50 people', async () => {
    const { eventId } = await create();
    for (let i = 1; i < 50; i++) {
      expect((await call('POST', `/api/events/${eventId}/people`, { name: `Person ${i}` })).status).toBe(201);
    }
    const res = await call('POST', `/api/events/${eventId}/people`, { name: 'One too many' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('event_full');
  });
});
