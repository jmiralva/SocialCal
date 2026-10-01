const createdKey = (eventId: string) => `socialcal:created:${eventId}`;
const EDIT_KEY = /^[A-Za-z0-9]{22}$/;

// In-memory fallback so the just-created edit key survives the session when browser storage throws.
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

// The edit key is shown once, in the ready sheet after creating. Identity itself lives in the server-set cookie.
export function markJustCreated(eventId: string, editKey: string): void {
  write(() => sessionStorage, createdKey(eventId), editKey);
}

export function peekJustCreated(eventId: string): string | null {
  const value = read(() => sessionStorage, createdKey(eventId));
  return value && EDIT_KEY.test(value) ? value : null;
}

export function clearJustCreated(eventId: string): void {
  remove(() => sessionStorage, createdKey(eventId));
}
