import type { Env } from './env';
import { ApiError, str } from './errors';
import { randomId, sha256 } from './crypto';
import { linkedParticipant, requireParticipant, type Device } from './device';
import { firstError, nameKey, validateEventFields, validatePersonName } from '../shared/validate';
import type { CreateEventResult, EventInfo, EventPayload, JoinResult } from '../shared/types';

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

export async function createEvent(env: Env, device: Device, body: Record<string, unknown>): Promise<CreateEventResult> {
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
  const deviceHash = await device.ensure();
  const now = new Date().toISOString();
  // Order matters: foreign keys are checked per statement.
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO events (id, name, description, start_date, end_date, creator_participant_id, edit_key_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(eventId, input.name, input.description, input.startDate, input.endDate, participantId, await sha256(editKey), now, now),
    env.DB.prepare(
      `INSERT INTO participants (id, event_id, name, name_key, dates, created_at, updated_at)
       VALUES (?, ?, ?, ?, '[]', ?, ?)`,
    ).bind(participantId, eventId, creatorName, nameKey(creatorName), now, now),
    env.DB.prepare('INSERT INTO devices (device_hash, event_id, participant_id, created_at) VALUES (?, ?, ?, ?)').bind(
      deviceHash,
      eventId,
      participantId,
      now,
    ),
  ]);
  return { eventId, editKey };
}

export async function getEvent(env: Env, device: Device, id: string): Promise<EventPayload> {
  const row = await loadEvent(env, id);
  const { results } = await env.DB.prepare(
    'SELECT id, name, dates FROM participants WHERE event_id = ? ORDER BY created_at, rowid',
  )
    .bind(id)
    .all<{ id: string; name: string; dates: string }>();
  const participantId = await linkedParticipant(env, device.hash, id);
  return {
    event: toEventInfo(row),
    participants: results.map((p) => ({ id: p.id, name: p.name, dates: JSON.parse(p.dates) as string[] })),
    me: participantId ? { participantId, isCreator: participantId === row.creator_participant_id } : null,
  };
}

export async function updateEvent(env: Env, device: Device, id: string, body: Record<string, unknown>) {
  const row = await loadEvent(env, id);
  await requireParticipant(env, device.hash, id, row.creator_participant_id);
  const merged = {
    name: 'name' in body ? str(body.name) : row.name,
    description: 'description' in body ? str(body.description) : row.description,
    startDate: 'startDate' in body ? str(body.startDate) : row.start_date,
    endDate: 'endDate' in body ? str(body.endDate) : row.end_date,
  };
  const message = firstError(validateEventFields(merged));
  if (message) throw new ApiError(400, 'invalid', message);
  await env.DB.prepare('UPDATE events SET name = ?, description = ?, start_date = ?, end_date = ?, updated_at = ? WHERE id = ?')
    .bind(merged.name, merged.description, merged.startDate, merged.endDate, new Date().toISOString(), id)
    .run();
  return {
    event: toEventInfo({
      ...row,
      name: merged.name,
      description: merged.description,
      start_date: merged.startDate,
      end_date: merged.endDate,
    }),
  };
}

// Links this device to the creator. Nothing rotates, so every device that has opened the edit link stays linked.
export async function claimCreator(env: Env, device: Device, id: string, body: Record<string, unknown>): Promise<JoinResult> {
  const row = await loadEvent(env, id);
  const editKey = str(body.editKey);
  if (!editKey) throw new ApiError(400, 'edit_key_required', 'An edit key is required.');
  if ((await sha256(editKey)) !== row.edit_key_hash) {
    throw new ApiError(403, 'edit_key_invalid', "That edit link doesn't match this calendar.");
  }
  const deviceHash = await device.ensure();
  await env.DB.prepare(
    `INSERT INTO devices (device_hash, event_id, participant_id, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (device_hash, event_id) DO UPDATE SET participant_id = excluded.participant_id`,
  )
    .bind(deviceHash, id, row.creator_participant_id, new Date().toISOString())
    .run();
  return { participantId: row.creator_participant_id };
}
