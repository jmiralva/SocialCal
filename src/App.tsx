import { useCallback, useEffect, useState } from 'preact/hooks';
import { CreatePage } from './pages/CreatePage';
import { NotFound } from './pages/NotFound';

export type Navigate = (to: string) => void;

export const EVENT_PATH = /^\/e\/([A-Za-z0-9]{22})\/?$/;

export function App() {
  const [path, setPath] = useState(location.pathname);

  useEffect(() => {
    const onPop = () => setPath(location.pathname);
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback<Navigate>((to) => {
    history.pushState(null, '', to);
    setPath(new URL(to, location.origin).pathname);
    window.scrollTo(0, 0);
  }, []);

  if (path === '/') return <CreatePage navigate={navigate} />;
  return <NotFound navigate={navigate} />;
}
