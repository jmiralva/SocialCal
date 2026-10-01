export type Identity = { participantId?: string; token?: string; editKey?: string };

const identityKey = (eventId: string) => `socialcal:${eventId}`;
const createdKey = (eventId: string) => `socialcal:created:${eventId}`;

export function loadIdentity(eventId: string): Identity {
  try {
    const raw = localStorage.getItem(identityKey(eventId));
    return raw ? (JSON.parse(raw) as Identity) : {};
  } catch {
    return {};
  }
}

export function saveIdentity(eventId: string, patch: Identity): Identity {
  const next = { ...loadIdentity(eventId), ...patch };
  try {
    localStorage.setItem(identityKey(eventId), JSON.stringify(next));
  } catch {
    // storage unavailable: identity lives in component state for this session
  }
  return next;
}

export function markJustCreated(eventId: string): void {
  try {
    sessionStorage.setItem(createdKey(eventId), '1');
  } catch {
    // ignore
  }
}

export function consumeJustCreated(eventId: string): boolean {
  try {
    const hit = sessionStorage.getItem(createdKey(eventId)) === '1';
    sessionStorage.removeItem(createdKey(eventId));
    return hit;
  } catch {
    return false;
  }
}
