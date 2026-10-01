import { useEffect } from 'preact/hooks';

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [message]);
  return (
    <div class="toast" role="status">
      {message}
    </div>
  );
}
