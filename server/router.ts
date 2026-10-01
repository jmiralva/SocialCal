import type { Env } from './env';
import { ApiError, errorResponse, json, readBody } from './errors';
import { Device } from './device';
import { claimCreator, createEvent, getEvent, updateEvent } from './events';
import { joinEvent, updatePerson } from './people';

export type { Env };

export async function handleApi(request: Request, env: Env): Promise<Response> {
  try {
    const parts = new URL(request.url).pathname.replace(/\/+$/, '').split('/').slice(1);
    if (parts[0] !== 'api' || parts[1] !== 'events' || parts.length > 5) throw notFound();
    const [, , id, sub, pid] = parts;
    const method = request.method;
    checkOrigin(request);
    const device = await Device.from(request);

    let res: Response;
    if (!id && method === 'POST') res = json(await createEvent(env, device, await readBody(request)), 201);
    else if (id && !sub && method === 'GET') res = json(await getEvent(env, device, id));
    else if (id && !sub && method === 'PATCH') res = json(await updateEvent(env, device, id, await readBody(request)));
    else if (id && sub === 'claim-creator' && !pid && method === 'POST') {
      res = json(await claimCreator(env, device, id, await readBody(request)));
    } else if (id && sub === 'people' && !pid && method === 'POST') {
      res = json(await joinEvent(env, device, id, await readBody(request)), 201);
    } else if (id && sub === 'people' && pid && method === 'PATCH') {
      res = json(await updatePerson(env, device, id, pid, await readBody(request)));
    } else throw notFound();

    // Only successful responses reach here; errors never set the cookie.
    const cookie = device.setCookie(method === 'GET');
    if (cookie) res.headers.append('Set-Cookie', cookie);
    return res;
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e);
    console.error(e);
    return errorResponse(new ApiError(500, 'internal', 'Something went wrong.'));
  }
}

// SameSite=Lax stops other sites, but pages.dev previews are same-site with production, so check Origin too.
function checkOrigin(request: Request): void {
  if (request.method === 'GET' || request.method === 'HEAD') return;
  const origin = request.headers.get('Origin');
  if (origin === null) return;
  const host = request.headers.get('Host') ?? new URL(request.url).host;
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    // "null" and other unparseable values never match
  }
  if (originHost !== host) throw new ApiError(403, 'bad_origin', 'Request blocked.');
}

const notFound = () => new ApiError(404, 'not_found', 'Not found.');
