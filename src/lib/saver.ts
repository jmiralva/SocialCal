export type SaverStatus = 'idle' | 'saving' | 'retrying';

export function createSaver(opts: {
  save: (dates: string[]) => Promise<void>;
  onStatus: (s: SaverStatus) => void;
  debounceMs?: number;
  retryDelays?: number[];
}) {
  const debounceMs = opts.debounceMs ?? 500;
  const delays = opts.retryDelays ?? [2000, 5000, 10000, 30000];
  let latest: string[] | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;
  let inFlight = false;
  let disposed = false;

  const run = async () => {
    if (inFlight || latest === null) return;
    const sending = latest;
    inFlight = true;
    opts.onStatus(attempt ? 'retrying' : 'saving');
    try {
      await opts.save(sending);
    } catch {
      inFlight = false;
      if (disposed) return;
      const delay = delays[Math.min(attempt, delays.length - 1)];
      attempt += 1;
      opts.onStatus('retrying');
      clearTimeout(timer);
      timer = setTimeout(run, delay);
      return;
    }
    inFlight = false;
    attempt = 0;
    if (latest === sending) {
      latest = null;
      if (!disposed) opts.onStatus('idle');
    } else if (!disposed) {
      clearTimeout(timer);
      timer = setTimeout(run, 0);
    }
  };

  const flush = () => {
    clearTimeout(timer);
    void run();
  };

  return {
    schedule(dates: string[]) {
      latest = dates;
      if (attempt === 0) {
        clearTimeout(timer);
        timer = setTimeout(run, debounceMs);
      }
    },
    flush,
    hasPending: () => latest !== null,
    dispose() {
      flush();
      disposed = true;
      clearTimeout(timer);
    },
  };
}
