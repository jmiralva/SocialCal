import type { Navigate } from '../App';
import { TopBar } from '../components/TopBar';

export function NotFound({ navigate }: { navigate: Navigate }) {
  return (
    <div class="page">
      <TopBar onNew={() => navigate('/')} />
      <div class="center">
        <div class="empty">
          <h3>This calendar doesn't exist</h3>
          <p>The link might be mistyped, or the calendar was removed.</p>
          <button type="button" class="btn" onClick={() => navigate('/')}>
            Create a new one
          </button>
        </div>
      </div>
    </div>
  );
}
