import type { Env } from './env';
import { ApiError, str } from './errors';
import { randomId } from './crypto';
import { linkedParticipant, requireParticipant, type Device } from './device';
import { loadEvent } from './events';
import { LIMITS, nameKey, validateDates, validatePersonName } from '../shared/validate';
import type { JoinResult, Participant } from '../shared/types';

const nameTaken = (name: string) =>
  new ApiError(409, 'name_taken', `Someone named ${name} already joined. Try adding a last initial.`);
const alreadyJoined = () => new ApiError(409, 'already_joined', "You've already joined this calendar.");

export async function joinEvent(env: Env, device: Device, id: string, body: Record<string, unknown>): Promise<JoinResult> {
  await loadEvent(env, id);
  const name = str(body.name);
  const message = validatePersonName(name);
  if (message) throw new ApiError(400, 'invalid', message);
  if (await linkedParticipant(env, device.hash, id)) throw alreadyJoined();
  const taken = await env.DB.prepare('SELECT 1 FROM participants WHERE event_id = ? AND name_key = ?')
    .bind(id, nameKey(name))
    .first();
  if (taken) throw nameTaken(name);
  const participantId = randomId();
  const deviceHash = await device.ensure();
  const now = new Date().toISOString();
  let changes = 0;
  try {
    // One transaction. The conditional insert keeps the 50-person cap correct under concurrent joins,
    // and the device row is only written when the participant row was.
    const [inserted] = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO participants (id, event_id, name, name_key, dates, created_at, updated_at)
         SELECT ?, ?, ?, ?, '[]', ?, ?
         WHERE (SELECT COUNT(*) FROM participants WHERE event_id = ?) < ?`,
      ).bind(participantId, id, name, nameKey(name), now, now, id, LIMITS.participants),
      env.DB.prepare(
        `INSERT INTO devices (device_hash, event_id, participant_id, created_at)
         SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM participants WHERE id = ?)`,
      ).bind(deviceHash, id, participantId, now, participantId),
    ]);
    changes = inserted.meta.changes;
  } catch (e) {
    if (String(e).includes('devices.')) throw alreadyJoined(); // two tabs joining at once
    if (String(e).includes('UNIQUE')) throw nameTaken(name);
    throw e;
  }
  if (!changes) throw new ApiError(409, 'event_full', 'This calendar is full (50 people).');
  return { participantId };
}

export async function updatePerson(
  env: Env,
  device: Device,
  id: string,
  pid: string,
  body: Record<string, unknown>,
): Promise<Participant> {
  const row = await env.DB.prepare('SELECT id, name, dates FROM participants WHERE id = ? AND event_id = ?')
    .bind(pid, id)
    .first<{ id: string; name: string; dates: string }>();
  if (!row) throw new ApiError(404, 'person_not_found', 'That person is not part of this calendar.');
  await requireParticipant(env, device.hash, id, pid);

  let name = row.name;
  let dates = JSON.parse(row.dates) as string[];
  if ('name' in body) {
    name = str(body.name);
    const message = validatePersonName(name);
    if (message) throw new ApiError(400, 'invalid', message);
    if (nameKey(name) !== nameKey(row.name)) {
      const clash = await env.DB.prepare('SELECT 1 FROM participants WHERE event_id = ? AND name_key = ? AND id != ?')
        .bind(id, nameKey(name), pid)
        .first();
      if (clash) throw nameTaken(name);
    }
  }
  if ('dates' in body) {
    const message = validateDates(body.dates);
    if (message) throw new ApiError(400, 'invalid', message);
    dates = [...new Set(body.dates as string[])].sort();
  }
  try {
    await env.DB.prepare('UPDATE participants SET name = ?, name_key = ?, dates = ?, updated_at = ? WHERE id = ?')
      .bind(name, nameKey(name), JSON.stringify(dates), new Date().toISOString(), pid)
      .run();
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw nameTaken(name);
    throw e;
  }
  return { id: pid, name, dates };
}
