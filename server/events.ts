import type { Env } from './env';
import { ApiError, str } from './errors';
import { randomId, sha256 } from './crypto';
import { firstError, nameKey, validateEventFields, validatePersonName } from '../shared/validate';
import type { CreateEventResult, EventInfo, EventPayload } from '../shared/types';

export type EventRow = {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  creator_participant_id: string;
  edit_key_hash: string;
  creator_name: string;
};

const EVENT_SELECT = `SELECT e.id, e.name, e.description, e.start_date, e.end_date, e.creator_participant_id,
  e.edit_key_hash, p.name AS creator_name
  FROM events e JOIN participants p ON p.id = e.creator_participant_id WHERE e.id = ?`;

export async function loadEvent(env: Env, id: string): Promise<EventRow> {
  const row = await env.DB.prepare(EVENT_SELECT).bind(id).first<EventRow>();
  if (!row) throw new ApiError(404, 'event_not_found', "This calendar doesn't exist.");
  return row;
}

export function toEventInfo(row: EventRow): EventInfo {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    creatorName: row.creator_name,
    creatorParticipantId: row.creator_participant_id,
  };
}

export async function requireEditKey(env: Env, request: Request, id: string): Promise<EventRow> {
  const row = await loadEvent(env, id);
  const key = request.headers.get('X-Edit-Key');
  if (!key) throw new ApiError(401, 'edit_key_required', 'An edit key is required.');
  if ((await sha256(key)) !== row.edit_key_hash) {
    throw new ApiError(403, 'edit_key_invalid', "This browser can't edit this event.");
  }
  return row;
}

export async function createEvent(env: Env, body: Record<string, unknown>): Promise<CreateEventResult> {
  const input = {
    name: str(body.name),
    description: str(body.description),
    startDate: str(body.startDate),
    endDate: str(body.endDate),
  };
  const creatorName = str(body.creatorName);
  const message = firstError(validateEventFields(input)) ?? validatePersonName(creatorName);
  if (message) throw new ApiError(400, 'invalid', message);

  const eventId = randomId();
  const editKey = randomId();
  const participantId = randomId();
  const token = randomId();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO events (id, name, description, start_date, end_date, creator_participant_id, edit_key_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(eventId, input.name, input.description, input.startDate, input.endDate, participantId, await sha256(editKey), now, now),
    env.DB.prepare(
      `INSERT INTO participants (id, event_id, name, name_key, token_hash, dates, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '[]', ?, ?)`,
    ).bind(participantId, eventId, creatorName, nameKey(creatorName), await sha256(token), now, now),
  ]);
  return { eventId, editKey, participantId, token };
}

export async function getEvent(env: Env, id: string): Promise<EventPayload> {
  const row = await loadEvent(env, id);
  const { results } = await env.DB.prepare(
    'SELECT id, name, dates FROM participants WHERE event_id = ? ORDER BY created_at, rowid',
  )
    .bind(id)
    .all<{ id: string; name: string; dates: string }>();
  return {
    event: toEventInfo(row),
    participants: results.map((p) => ({ id: p.id, name: p.name, dates: JSON.parse(p.dates) as string[] })),
  };
}
