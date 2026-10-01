import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { api, ApiRequestError } from '../lib/api';
import type { EventPayload } from '../../shared/types';

export type LoadState = { status: 'loading' } | { status: 'error'; notFound: boolean } | { status: 'ready'; data: EventPayload };

export function useEvent(eventId: string, intervalMs = 20_000) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // Every refresh and every local change bumps seq; only the latest response may land.
  // This stops a GET that started before a save from overwriting the saved data.
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const data = await api.getEvent(eventId);
      if (mine === seq.current) setState({ status: 'ready', data });
    } catch (e) {
      if (mine !== seq.current) return;
      setState((prev) =>
        prev.status === 'ready' ? prev : { status: 'error', notFound: e instanceof ApiRequestError && e.status === 404 },
      );
    }
  }, [eventId]);

  useEffect(() => {
    refresh();
    const tick = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [refresh, intervalMs]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    refresh();
  }, [refresh]);

  const setData = useCallback((fn: (d: EventPayload) => EventPayload) => {
    seq.current += 1;
    setState((s) => (s.status === 'ready' ? { status: 'ready', data: fn(s.data) } : s));
  }, []);

  return { state, refresh, retry, setData };
}
