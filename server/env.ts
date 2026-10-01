export interface Env {
  DB: D1Database;
}

// The /e/:id Function also gets Pages' static assets. Typed narrowly so tests can pass a stub.
export type PreviewEnv = Env & { ASSETS: { fetch: (input: URL | Request) => Promise<Response> } };
