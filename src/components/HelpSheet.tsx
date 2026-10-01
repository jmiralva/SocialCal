import { Sheet } from './Sheet';

export function HelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label="How socialcal works" onClose={onClose}>
      <h2>How socialcal works</h2>
      <p class="sheet-sub">Find a day that works for a group, without a group chat full of dates.</p>

      <h3 class="help-h">Plan</h3>
      <ul class="help-list">
        <li>One person creates a calendar with a date window.</li>
        <li>
          <b>Share</b> sends everyone the link.
        </li>
      </ul>

      <h3 class="help-h">Mark your days</h3>
      <ul class="help-list">
        <li>
          <b>Tap</b> a day you're free. Tap again to unmark it.
        </li>
        <li>
          <b>Drag</b> across days to mark several at once.
        </li>
        <li>Your days have an orange outline. Greener days have more people free.</li>
        <li>
          <b>Best days</b> ranks the days that work for the most people.
        </li>
      </ul>

      <h3 class="help-h">No accounts</h3>
      <ul class="help-list">
        <li>No sign-up and no app. This browser remembers who you are.</li>
        <li>Creators get a private edit link for editing from another device.</li>
      </ul>

      <div class="sheet-actions">
        <button type="button" class="btn" onClick={onClose}>
          Got it
        </button>
      </div>
    </Sheet>
  );
}
