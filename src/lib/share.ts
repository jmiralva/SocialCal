export const eventUrl = (id: string, origin: string = location.origin) => `${origin}/e/${id}`;

export const editUrl = (id: string, key: string, origin: string = location.origin) => `${origin}/e/${id}#edit=${key}`;

export function readEditKeyFromHash(hash: string): string | null {
  const m = /^#edit=([A-Za-z0-9]{22})$/.exec(hash);
  return m ? m[1] : null;
}

export async function shareOrCopy(url: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (coarse && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
