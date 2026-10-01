export type Identity = { participantId?: string; token?: string; editKey?: string };

const identityKey = (eventId: string) => `socialcal:${eventId}`;
const createdKey = (eventId: string) => `socialcal:created:${eventId}`;

// In-memory fallback so identity and the just-created flag survive the session when browser storage throws.
const memory = new Map<string, string>();

function read(store: () => Storage, key: string): string | null {
  try {
    return store().getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(store: () => Storage, key: string, value: string): void {
  try {
    store().setItem(key, value);
    memory.delete(key);
  } catch {
    memory.set(key, value);
  }
}

function remove(store: () => Storage, key: string): void {
  try {
    store().removeItem(key);
  } catch {
    // fall through to memory
  }
  memory.delete(key);
}

export function loadIdentity(eventId: string): Identity {
  const raw = read(() => localStorage, identityKey(eventId));
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Identity) : {};
  } catch {
    return {};
  }
}

export function saveIdentity(eventId: string, patch: Identity): Identity {
  const next = { ...loadIdentity(eventId), ...patch };
  write(() => localStorage, identityKey(eventId), JSON.stringify(next));
  return next;
}

export function markJustCreated(eventId: string): void {
  write(() => sessionStorage, createdKey(eventId), '1');
}

export function consumeJustCreated(eventId: string): boolean {
  const hit = read(() => sessionStorage, createdKey(eventId)) === '1';
  remove(() => sessionStorage, createdKey(eventId));
  return hit;
}
