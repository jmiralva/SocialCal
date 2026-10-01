import { describe, expect, it } from 'vitest';
import { Device } from './device';

const req = (url: string, cookie?: string) => new Request(url, { headers: cookie ? { Cookie: cookie } : {} });
const SECRET = 'A'.repeat(22);

describe('Device', () => {
  it('reads a valid cookie among others and exposes only its hash', async () => {
    const d = await Device.from(req('https://x.test/api', `other=1; sc_device=${SECRET}; more=2`));
    expect(d.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('treats a missing or malformed cookie as absent', async () => {
    for (const c of [undefined, 'sc_device=', 'sc_device=short', `sc_device=${'A'.repeat(23)}`, `sc_device=${'A'.repeat(20)}!!`]) {
      expect((await Device.from(req('https://x.test/api', c))).hash).toBeNull();
    }
  });

  it('mints a secret once and sets the cookie with all attributes', async () => {
    const d = await Device.from(req('https://x.test/api'));
    expect(d.setCookie(false)).toBeNull();
    expect(d.setCookie(true)).toBeNull();
    const hash = await d.ensure();
    expect(d.hash).toBe(hash);
    expect(await d.ensure()).toBe(hash);
    expect(d.setCookie(false)).toMatch(/^sc_device=[A-Za-z0-9]{22}; Max-Age=34560000; Path=\/; HttpOnly; SameSite=Lax; Secure$/);
  });

  it('re-sends an existing cookie only when refreshing', async () => {
    const d = await Device.from(req('https://x.test/api', `sc_device=${SECRET}`));
    expect(await d.ensure()).toBe(d.hash);
    expect(d.setCookie(false)).toBeNull();
    expect(d.setCookie(true)).toBe(`sc_device=${SECRET}; Max-Age=34560000; Path=/; HttpOnly; SameSite=Lax; Secure`);
  });

  it('omits Secure on localhost and 127.0.0.1', async () => {
    for (const origin of ['http://localhost:8788', 'http://127.0.0.1:8788']) {
      const d = await Device.from(req(`${origin}/api`));
      await d.ensure();
      expect(d.setCookie(false)).not.toContain('Secure');
    }
  });
});
