import type { Env } from './env';
import { ApiError } from './errors';
import { randomId, sha256 } from './crypto';

const NAME = 'sc_device';
const MAX_AGE = 34_560_000; // 400 days, Chrome's cap
const VALID = /^[A-Za-z0-9]{22}$/;

function readCookie(header: string | null): string | null {
  for (const part of (header ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1 && part.slice(0, eq).trim() === NAME) return part.slice(eq + 1).trim();
  }
  return null;
}

// The browser's identity across every event: a secret in an HttpOnly cookie, stored server-side only as its hash.
export class Device {
  private minted = false;

  private constructor(
    private secret: string | null,
    private currentHash: string | null,
    private readonly secure: boolean,
  ) {}

  static async from(request: Request): Promise<Device> {
    const value = readCookie(request.headers.get('Cookie'));
    const secret = value && VALID.test(value) ? value : null;
    const { hostname } = new URL(request.url);
    const local = hostname === 'localhost' || hostname === '127.0.0.1';
    return new Device(secret, secret ? await sha256(secret) : null, !local);
  }

  get hash(): string | null {
    return this.currentHash;
  }

  async ensure(): Promise<string> {
    if (!this.secret || !this.currentHash) {
      this.secret = randomId();
      this.currentHash = await sha256(this.secret);
      this.minted = true;
    }
    return this.currentHash;
  }

  // The Set-Cookie value for a successful response: always after minting, and for an existing cookie only when refreshing its expiry.
  setCookie(refresh: boolean): string | null {
    if (!this.secret || !(this.minted || refresh)) return null;
    return `${NAME}=${this.secret}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${this.secure ? '; Secure' : ''}`;
  }
}

export async function linkedParticipant(env: Env, deviceHash: string | null, eventId: string): Promise<string | null> {
  if (!deviceHash) return null;
  const row = await env.DB.prepare('SELECT participant_id FROM devices WHERE device_hash = ? AND event_id = ?')
    .bind(deviceHash, eventId)
    .first<{ participant_id: string }>();
  return row?.participant_id ?? null;
}

export async function requireParticipant(env: Env, deviceHash: string | null, eventId: string, participantId: string): Promise<void> {
  const linked = await linkedParticipant(env, deviceHash, eventId);
  if (!linked) throw new ApiError(401, 'device_required', "This browser isn't part of this calendar.");
  if (linked !== participantId) throw new ApiError(403, 'forbidden', "This browser can't make that change.");
}
