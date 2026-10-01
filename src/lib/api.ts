import type {
  ApiErrorBody,
  CreateEventInput,
  CreateEventResult,
  EventInfo,
  EventPatch,
  EventPayload,
  JoinResult,
  Participant,
} from '../../shared/types';

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      keepalive: init.method !== undefined && init.method !== 'GET',
    });
  } catch {
    throw new ApiRequestError(0, 'network', 'Network error');
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiRequestError(res.status, err?.code ?? 'unknown', err?.message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  createEvent: (input: CreateEventInput) => request<CreateEventResult>('/api/events', { method: 'POST', body: input }),
  getEvent: (id: string) => request<EventPayload>(`/api/events/${id}`),
  updateEvent: (id: string, editKey: string, patch: Partial<EventPatch>) =>
    request<{ event: EventInfo }>(`/api/events/${id}`, { method: 'PATCH', headers: { 'X-Edit-Key': editKey }, body: patch }),
  claimCreator: (id: string, editKey: string) =>
    request<JoinResult>(`/api/events/${id}/claim-creator`, { method: 'POST', headers: { 'X-Edit-Key': editKey } }),
  join: (id: string, name: string) => request<JoinResult>(`/api/events/${id}/people`, { method: 'POST', body: { name } }),
  updatePerson: (id: string, pid: string, token: string, patch: { name?: string; dates?: string[] }) =>
    request<Participant>(`/api/events/${id}/people/${pid}`, {
      method: 'PATCH',
      headers: { 'X-Participant-Token': token },
      body: patch,
    }),
};
