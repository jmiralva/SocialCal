import type { Env } from './env';
import { ApiError, errorResponse, json, readBody } from './errors';
import { createEvent, getEvent } from './events';

export type { Env };

export async function handleApi(request: Request, env: Env): Promise<Response> {
  try {
    const parts = new URL(request.url).pathname.replace(/\/+$/, '').split('/').slice(1);
    if (parts[0] !== 'api' || parts[1] !== 'events' || parts.length > 5) throw notFound();
    const [, , id, sub, pid] = parts;
    const method = request.method;

    if (!id && method === 'POST') return json(await createEvent(env, await readBody(request)), 201);
    if (id && !sub && method === 'GET') return json(await getEvent(env, id));
    throw notFound();
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e);
    console.error(e);
    return errorResponse(new ApiError(500, 'internal', 'Something went wrong.'));
  }
}

const notFound = () => new ApiError(404, 'not_found', 'Not found.');
