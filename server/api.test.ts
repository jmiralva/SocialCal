import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { handleApi } from './router';
import type { CreateEventResult, EventInfo, EventPayload, JoinResult, Participant } from '../shared/types';

// A browser's cookie jar: holds the sc_device secret between calls.
type Jar = { cookie?: string };

const call = async (
  method: string,
  path: string,
  body?: unknown,
  opts: { jar?: Jar; headers?: Record<string, string> } = {},
) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...opts.headers };
  if (opts.jar?.cookie) headers.Cookie = `sc_device=${opts.jar.cookie}`;
  const res = await handleApi(
    new Request(`https://test.local${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
  const set = /^sc_device=([A-Za-z0-9]{22});/.exec(res.headers.get('Set-Cookie') ?? '');
  if (set && opts.jar) opts.jar.cookie = set[1];
  return res;
};

const code = async (res: Response) => ((await res.json()) as { error: { code: string } }).error.code;

const validEvent = {
  name: 'Fall camping trip',
  description: 'Two nights',
  startDate: '2026-10-07',
  endDate: '2026-11-14',
  creatorName: 'Jorge',
};

async function create(overrides: Record<string, unknown> = {}) {
  const jar: Jar = {};
  const res = await call('POST', '/api/events', { ...validEvent, ...overrides }, { jar });
  expect(res.status).toBe(201);
  const created = (await res.json()) as CreateEventResult;
  const payload = (await (await call('GET', `/api/events/${created.eventId}`, undefined, { jar })).json()) as EventPayload;
  return { ...created, jar, participantId: payload.me!.participantId };
}

async function join(eventId: string, name: string) {
  const jar: Jar = {};
  const res = await call('POST', `/api/events/${eventId}/people`, { name }, { jar });
  expect(res.status).toBe(201);
  return { ...((await res.json()) as JoinResult), jar };
}

const getAs = async (eventId: string, jar?: Jar) =>
  (await (await call('GET', `/api/events/${eventId}`, undefined, { jar })).json()) as EventPayload;

describe('POST /api/events', () => {
  it('creates an event, links this device to the creator, and sets the cookie', async () => {
    const jar: Jar = {};
    const res = await call('POST', '/api/events', validEvent, { jar });
    expect(res.status).toBe(201);
    expect(res.headers.get('Set-Cookie')).toMatch(
      /^sc_device=[A-Za-z0-9]{22}; Max-Age=34560000; Path=\/; HttpOnly; SameSite=Lax; Secure$/,
    );
    const created = (await res.json()) as CreateEventResult;
    expect(Object.keys(created).sort()).toEqual(['editKey', 'eventId']);
    for (const v of [created.eventId, created.editKey]) expect(v).toMatch(/^[A-Za-z0-9]{22}$/);

    const payload = await getAs(created.eventId, jar);
    const creatorId = payload.event.creatorParticipantId;
    expect(payload.me).toEqual({ participantId: creatorId, isCreator: true });
    expect(payload.event).toEqual({
      id: created.eventId,
      name: 'Fall camping trip',
      description: 'Two nights',
      startDate: '2026-10-07',
      endDate: '2026-11-14',
      creatorName: 'Jorge',
      creatorParticipantId: creatorId,
    });
    expect(payload.participants).toEqual([{ id: creatorId, name: 'Jorge', dates: [] }]);
    expect((await getAs(created.eventId)).me).toBeNull();
  });

  it('reuses an existing device cookie', async () => {
    const a = await create();
    const before = a.jar.cookie;
    const res = await call('POST', '/api/events', validEvent, { jar: a.jar });
    expect(res.headers.get('Set-Cookie')).toBeNull();
    const b = (await res.json()) as CreateEventResult;
    expect(a.jar.cookie).toBe(before);
    expect((await getAs(b.eventId, a.jar)).me?.isCreator).toBe(true);
  });

  it('trims input and rejects invalid fields without setting a cookie', async () => {
    const res = await call('POST', '/api/events', { ...validEvent, name: '   ' });
    expect(res.status).toBe(400);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect(await res.json()).toEqual({ error: { code: 'invalid', message: 'Give the plan a name.' } });
    const tooLong = await call('POST', '/api/events', { ...validEvent, startDate: '2026-01-01', endDate: '2027-01-02' });
    expect(tooLong.status).toBe(400);
    const noName = await call('POST', '/api/events', { ...validEvent, creatorName: '' });
    expect(((await noName.json()) as { error: { message: string } }).error.message).toBe('Enter your name.');
  });

  it('rejects a non-object body', async () => {
    const res = await handleApi(new Request('https://test.local/api/events', { method: 'POST', body: 'nope' }), env);
    expect(res.status).toBe(400);
    expect(await code(res)).toBe('bad_json');
  });
});

describe('GET /api/events/:id', () => {
  it('404s for unknown ids without touching the cookie', async () => {
    const { jar } = await create();
    const res = await call('GET', '/api/events/AAAAAAAAAAAAAAAAAAAAAA', undefined, { jar });
    expect(res.status).toBe(404);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect(await code(res)).toBe('event_not_found');
  });

  it('never returns secrets or hashes', async () => {
    const created = await create();
    const text = await (await call('GET', `/api/events/${created.eventId}`, undefined, { jar: created.jar })).text();
    expect(text).not.toContain('hash');
    expect(text).not.toContain(created.editKey);
    expect(text).not.toContain(created.jar.cookie);
  });

  it('sets no-store caching', async () => {
    const created = await create();
    const res = await call('GET', `/api/events/${created.eventId}`);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('refreshes a valid cookie and never sets one for anonymous viewers', async () => {
    const created = await create();
    const anon = await call('GET', `/api/events/${created.eventId}`);
    expect(anon.headers.get('Set-Cookie')).toBeNull();
    const known = await call('GET', `/api/events/${created.eventId}`, undefined, { jar: created.jar });
    expect(known.headers.get('Set-Cookie')).toBe(
      `sc_device=${created.jar.cookie}; Max-Age=34560000; Path=/; HttpOnly; SameSite=Lax; Secure`,
    );
  });

  it('returns me as null for a device linked only to another event, but still refreshes its cookie', async () => {
    const a = await create();
    const b = await create();
    const res = await call('GET', `/api/events/${b.eventId}`, undefined, { jar: a.jar });
    expect(((await res.json()) as EventPayload).me).toBeNull();
    expect(res.headers.get('Set-Cookie')).toContain(`sc_device=${a.jar.cookie};`);
  });

  it('treats a malformed cookie as absent', async () => {
    const created = await create();
    const res = await call('GET', `/api/events/${created.eventId}`, undefined, { headers: { Cookie: 'sc_device=bad' } });
    expect(((await res.json()) as EventPayload).me).toBeNull();
    expect(res.headers.get('Set-Cookie')).toBeNull();
  });
});

describe('routing', () => {
  it('404s unknown routes', async () => {
    expect((await call('GET', '/api/nope')).status).toBe(404);
    expect((await call('DELETE', '/api/events/abc')).status).toBe(404);
  });
});

describe('Origin check', () => {
  it('rejects a mismatched or opaque Origin on mutating requests', async () => {
    for (const origin of ['https://evil.test', 'https://preview.test.local', 'null']) {
      const res = await call('POST', '/api/events', validEvent, { headers: { Origin: origin } });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: { code: 'bad_origin', message: 'Request blocked.' } });
    }
  });

  it('allows a matching Origin, a missing Origin, and any Origin on GET', async () => {
    expect((await call('POST', '/api/events', validEvent, { headers: { Origin: 'https://test.local' } })).status).toBe(201);
    const created = await create();
    const res = await call('GET', `/api/events/${created.eventId}`, undefined, { headers: { Origin: 'https://evil.test' } });
    expect(res.status).toBe(200);
  });

  it('compares against the Host header when present', async () => {
    const res = await call('POST', '/api/events', validEvent, {
      headers: { Host: 'localhost:5173', Origin: 'http://localhost:5173' },
    });
    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/events/:id', () => {
  it('requires the creator device', async () => {
    const { eventId } = await create();
    const none = await call('PATCH', `/api/events/${eventId}`, { name: 'x' });
    expect(none.status).toBe(401);
    expect(await none.json()).toEqual({
      error: { code: 'device_required', message: "This browser isn't part of this calendar." },
    });
    const other = await create();
    const elsewhere = await call('PATCH', `/api/events/${eventId}`, { name: 'x' }, { jar: other.jar });
    expect(elsewhere.status).toBe(401);
    const maya = await join(eventId, 'Maya');
    const notCreator = await call('PATCH', `/api/events/${eventId}`, { name: 'x' }, { jar: maya.jar });
    expect(notCreator.status).toBe(403);
    expect(await notCreator.json()).toEqual({
      error: { code: 'forbidden', message: "This browser can't make that change." },
    });
  });

  it('updates fields and keeps out-of-range dates stored', async () => {
    const { eventId, jar, participantId } = await create();
    await call('PATCH', `/api/events/${eventId}/people/${participantId}`, { dates: ['2026-11-10'] }, { jar });
    const res = await call('PATCH', `/api/events/${eventId}`, { name: 'New name', endDate: '2026-10-31' }, { jar });
    expect(res.status).toBe(200);
    const { event } = (await res.json()) as { event: EventInfo };
    expect(event.name).toBe('New name');
    expect(event.endDate).toBe('2026-10-31');
    expect(event.startDate).toBe('2026-10-07');
    const payload = (await (await call('GET', `/api/events/${eventId}`)).json()) as { participants: Participant[] };
    expect(payload.participants[0].dates).toEqual(['2026-11-10']);
  });

  it('validates the merged result', async () => {
    const { eventId, jar } = await create();
    const res = await call('PATCH', `/api/events/${eventId}`, { endDate: '2026-10-01' }, { jar });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/events/:id/claim-creator', () => {
  it('requires a correct edit key in the body', async () => {
    const { eventId } = await create();
    const path = `/api/events/${eventId}/claim-creator`;
    const noBody = await call('POST', path);
    expect(noBody.status).toBe(400);
    expect(await code(noBody)).toBe('bad_json');
    const empty = await call('POST', path, {});
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ error: { code: 'edit_key_required', message: 'An edit key is required.' } });
    const jar: Jar = {};
    const wrong = await call('POST', path, { editKey: 'C'.repeat(22) }, { jar });
    expect(wrong.status).toBe(403);
    expect(await wrong.json()).toEqual({
      error: { code: 'edit_key_invalid', message: "That edit link doesn't match this calendar." },
    });
    expect(jar.cookie).toBeUndefined();
  });

  it('links a second device to the creator without unlinking the first', async () => {
    const { eventId, editKey, jar, participantId } = await create();
    const second: Jar = {};
    const res = await call('POST', `/api/events/${eventId}/claim-creator`, { editKey }, { jar: second });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ participantId });
    expect(second.cookie).toMatch(/^[A-Za-z0-9]{22}$/);
    expect((await getAs(eventId, second)).me).toEqual({ participantId, isCreator: true });
    for (const device of [jar, second]) {
      expect((await call('PATCH', `/api/events/${eventId}`, { name: 'Renamed' }, { jar: device })).status).toBe(200);
      expect((await call('PATCH', `/api/events/${eventId}/people/${participantId}`, { dates: [] }, { jar: device })).status).toBe(200);
    }
  });

  it('moves an existing participant link on this device to the creator', async () => {
    const { eventId, editKey, participantId } = await create();
    const maya = await join(eventId, 'Maya');
    const res = await call('POST', `/api/events/${eventId}/claim-creator`, { editKey }, { jar: maya.jar });
    expect(res.status).toBe(200);
    expect((await getAs(eventId, maya.jar)).me).toEqual({ participantId, isCreator: true });
    const old = await call('PATCH', `/api/events/${eventId}/people/${maya.participantId}`, { dates: [] }, { jar: maya.jar });
    expect(old.status).toBe(403);
  });
});

describe('people', () => {
  it('joins, links the device, then saves dates with the cookie', async () => {
    const { eventId } = await create();
    const jar: Jar = {};
    const joinRes = await call('POST', `/api/events/${eventId}/people`, { name: '  Maya ' }, { jar });
    expect(joinRes.status).toBe(201);
    const maya = (await joinRes.json()) as JoinResult;
    expect(Object.keys(maya)).toEqual(['participantId']);
    expect((await getAs(eventId, jar)).me).toEqual({ participantId: maya.participantId, isCreator: false });
    const res = await call(
      'PATCH',
      `/api/events/${eventId}/people/${maya.participantId}`,
      { dates: ['2026-10-10', '2026-10-09', '2026-10-10'] },
      { jar },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: maya.participantId, name: 'Maya', dates: ['2026-10-09', '2026-10-10'] });
  });

  it('lets one device join different events', async () => {
    const a = await create();
    const b = await create();
    const res = await call('POST', `/api/events/${b.eventId}/people`, { name: 'Maya' }, { jar: a.jar });
    expect(res.status).toBe(201);
    expect((await getAs(a.eventId, a.jar)).me?.isCreator).toBe(true);
    expect((await getAs(b.eventId, a.jar)).me?.isCreator).toBe(false);
  });

  it('rejects a second join from an already-linked device', async () => {
    const { eventId, jar } = await create();
    const res = await call('POST', `/api/events/${eventId}/people`, { name: 'Maya' }, { jar });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { code: 'already_joined', message: "You've already joined this calendar." } });
  });

  it('rejects duplicate names case-insensitively without setting a cookie', async () => {
    const { eventId } = await create();
    const jar: Jar = {};
    const res = await call('POST', `/api/events/${eventId}/people`, { name: 'jorge' }, { jar });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: 'name_taken', message: 'Someone named jorge already joined. Try adding a last initial.' },
    });
    expect(jar.cookie).toBeUndefined();
  });

  it('requires the matching device to change a person', async () => {
    const { eventId, participantId } = await create();
    const path = `/api/events/${eventId}/people/${participantId}`;
    expect((await call('PATCH', path, { dates: [] })).status).toBe(401);
    const maya = await join(eventId, 'Maya');
    const res = await call('PATCH', path, { dates: [] }, { jar: maya.jar });
    expect(res.status).toBe(403);
    expect(await code(res)).toBe('forbidden');
  });

  it('renames, allowing a case change but not a clash', async () => {
    const { eventId, participantId, jar } = await create();
    const maya = await join(eventId, 'Maya');
    const path = `/api/events/${eventId}/people/${participantId}`;
    expect((await call('PATCH', path, { name: 'JORGE' }, { jar })).status).toBe(200);
    const clash = await call('PATCH', path, { name: 'maya' }, { jar });
    expect(clash.status).toBe(409);
    const payload = await getAs(eventId);
    expect(payload.event.creatorName).toBe('JORGE');
    expect(payload.participants.map((p) => p.id)).toEqual([participantId, maya.participantId]);
  });

  it('validates names and dates', async () => {
    const { eventId, participantId, jar } = await create();
    expect((await call('POST', `/api/events/${eventId}/people`, { name: '' })).status).toBe(400);
    expect((await call('POST', `/api/events/${eventId}/people`, { name: 'x'.repeat(41) })).status).toBe(400);
    const path = `/api/events/${eventId}/people/${participantId}`;
    expect((await call('PATCH', path, { name: 'x'.repeat(41) }, { jar })).status).toBe(400);
    expect((await call('POST', '/api/events', { ...validEvent, name: 'x'.repeat(81) })).status).toBe(400);
    expect((await call('PATCH', path, { dates: ['2026-02-30'] }, { jar })).status).toBe(400);
  });

  it('404s for a person from another event before checking the device', async () => {
    const a = await create();
    const b = await create();
    const res = await call('PATCH', `/api/events/${b.eventId}/people/${a.participantId}`, { dates: [] }, { jar: a.jar });
    expect(res.status).toBe(404);
  });

  it('caps an event at 50 people with event_full, not a server error', async () => {
    const { eventId } = await create();
    for (let i = 1; i < 50; i++) {
      expect((await call('POST', `/api/events/${eventId}/people`, { name: `Person ${i}` }, { jar: {} })).status).toBe(201);
    }
    const jar: Jar = {};
    const res = await call('POST', `/api/events/${eventId}/people`, { name: 'One too many' }, { jar });
    expect(res.status).toBe(409);
    expect(await code(res)).toBe('event_full');
    expect(jar.cookie).toBeUndefined();
  });
});
