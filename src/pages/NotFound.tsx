import type { Navigate } from '../App';
import { TopBar } from '../components/TopBar';
import { copy } from '../copy';

export function NotFound({ navigate }: { navigate: Navigate }) {
  return (
    <div class="page">
      <TopBar onNew={() => navigate('/')} />
      <div class="center">
        <div class="empty">
          <h3>{copy.notFound.title}</h3>
          <p>{copy.notFound.body}</p>
          <button type="button" class="btn" onClick={() => navigate('/')}>
            {copy.notFound.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
