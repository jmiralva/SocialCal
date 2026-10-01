import { act, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventPage } from './EventPage';
import { api, ApiRequestError } from '../lib/api';
import { markJustCreated, peekJustCreated } from '../lib/storage';
import type { EventPayload, Me } from '../../shared/types';

vi.mock(import('../lib/api'), async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    api: { ...mod.api, getEvent: vi.fn(), join: vi.fn(), updatePerson: vi.fn(), updateEvent: vi.fn(), claimCreator: vi.fn() },
  };
});

const ID = 'E'.repeat(22);
const KEY = 'K'.repeat(22);
const payload: EventPayload = {
  event: {
    id: ID,
    name: 'Fall camping trip',
    description: 'Two nights',
    startDate: '2030-10-07',
    endDate: '2030-11-14',
    creatorName: 'Jorge',
    creatorParticipantId: 'J',
  },
  participants: [{ id: 'J', name: 'Jorge', dates: ['2030-10-10'] }],
  me: null,
};
const CREATOR: Me = { participantId: 'J', isCreator: true };
const withMe = (me: Me | null, extra: Partial<EventPayload> = {}): EventPayload => ({ ...payload, ...extra, me });
const never = () => new Promise<never>(() => {});

beforeEach(() => {
  document.title = '';
  for (const fn of [api.getEvent, api.join, api.updatePerson, api.updateEvent, api.claimCreator]) vi.mocked(fn).mockReset();
});
afterEach(() => history.replaceState(null, '', '/'));

describe('EventPage', () => {
  it('titles the tab with the event name once it loads, and the plain brand until then', async () => {
    vi.mocked(api.getEvent).mockReturnValue(never());
    const loading = render(<EventPage eventId={ID} navigate={vi.fn()} />);
    expect(document.title).toBe('SocialCal');
    loading.unmount();
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    await waitFor(() => expect(document.title).toBe('SocialCal: Fall camping trip'));
  });

  it('circles the best day once two people share it, without drawing it on load', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(
      withMe(CREATOR, {
        participants: [
          { id: 'J', name: 'Jorge', dates: ['2030-10-10'] },
          { id: 'M', name: 'Maya', dates: ['2030-10-10'] },
        ],
      }),
    );
    const { container } = render(<EventPage eventId={ID} navigate={vi.fn()} />);
    await screen.findByText('Jorge', { selector: 'b.you' });
    const day = container.querySelector('[data-date="2030-10-10"]')!;
    expect(day.querySelector('.ring')).toBeTruthy();
    expect(day.querySelector('.ring.draw')).toBeNull();
    expect(container.querySelector('[data-date="2030-10-11"] .ring')).toBeNull();
  });

  it('circles nothing while only one of two people has marked dates', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(
      withMe(CREATOR, {
        participants: [
          { id: 'J', name: 'Jorge', dates: ['2030-10-10', '2030-10-11'] },
          { id: 'M', name: 'Maya', dates: [] },
        ],
      }),
    );
    const { container } = render(<EventPage eventId={ID} navigate={vi.fn()} />);
    await screen.findByText('Jorge', { selector: 'b.you' });
    expect(container.querySelector('.ring')).toBeNull();
    expect(screen.getByText('Nobody else yet')).toBeTruthy();
  });

  it('draws the circle when marking a day makes it the best', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(
      withMe(CREATOR, {
        participants: [
          { id: 'J', name: 'Jorge', dates: ['2030-10-10'] },
          { id: 'M', name: 'Maya', dates: ['2030-10-10', '2030-10-11'] },
        ],
      }),
    );
    vi.mocked(api.updatePerson).mockImplementation(never);
    const { container } = render(<EventPage eventId={ID} navigate={vi.fn()} />);
    await screen.findByText('Jorge', { selector: 'b.you' });
    expect(container.querySelector('[data-date="2030-10-11"] .ring')).toBeNull();
    // Let Preact run the page's pending passive effects (they wait a frame). Otherwise its "new identity: drop unsaved
    // dates" reset runs after the click and wipes the local marks.
    await act(() => new Promise((r) => setTimeout(r, 120)));
    fireEvent.click(container.querySelector('[data-date="2030-10-11"]')!, { detail: 0 }); // mark Oct 11 (keyboard-style click)
    expect(container.querySelector('[data-date="2030-10-11"] .ring.draw')).toBeTruthy();
    expect(container.querySelector('[data-date="2030-10-10"] .ring.draw')).toBeNull();
  });

  it('browses on Escape from the name sheet', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    await screen.findByRole('dialog', { name: 'Help find a date for Fall camping trip' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Viewing only')).toBeTruthy();
  });

  it('brings the name sheet back with its field focused after Escape from help', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    await screen.findByRole('dialog', { name: 'Help find a date for Fall camping trip' });
    fireEvent.click(screen.getByRole('button', { name: 'How it works' }));
    expect(screen.getByRole('dialog', { name: 'How SocialCal works' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(await screen.findByRole('dialog', { name: 'Help find a date for Fall camping trip' })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Your name')));
  });

  it('switches tabs with the arrow keys', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(withMe(CREATOR));
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    const all = await screen.findByRole('tab', { name: 'All days' });
    const best = screen.getByRole('tab', { name: 'Best days' });
    expect(all.getAttribute('tabindex')).toBe('0');
    expect(best.getAttribute('tabindex')).toBe('-1');
    act(() => all.focus());
    fireEvent.keyDown(all, { key: 'ArrowRight' });
    expect(best.getAttribute('aria-selected')).toBe('true');
    expect(best.getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(best);
    fireEvent.keyDown(best, { key: 'ArrowLeft' });
    expect(all.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(all);
  });

  it('asks a new visitor for their name and supports just looking', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    expect(await screen.findByRole('dialog', { name: 'Help find a date for Fall camping trip' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Just browse' }));
    expect(screen.getByText('Viewing only')).toBeTruthy();
    expect(screen.getByText('Created by')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit event' })).toBeNull();
  });

  it('tells a new visitor who is asking', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    const sheet = await screen.findByRole('dialog', { name: 'Help find a date for Fall camping trip' });
    expect(sheet.textContent).toContain('Jorge wants to find a day that works. Enter your name and add your availability.');
  });

  it('shows a duplicate-name error from the server', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    vi.mocked(api.join).mockRejectedValue(
      new ApiRequestError(409, 'name_taken', 'Someone named Jorge already joined. Try adding a last initial.'),
    );
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    fireEvent.input(await screen.findByLabelText('Your name'), { target: { value: 'Jorge' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Someone named Jorge already joined. Try adding a last initial.')).toBeTruthy();
  });

  it('shows the creator their marking bar and edit link from me', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(withMe(CREATOR));
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    expect(await screen.findByText('Jorge', { selector: 'b.you' })).toBeTruthy();
    expect(screen.getByText(/· 1 day$/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit event' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens and closes help from the top bar', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(withMe(CREATOR));
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'How SocialCal works' }));
    expect(screen.getByRole('dialog', { name: 'How SocialCal works' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes help from the overlay', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(withMe(CREATOR));
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'How SocialCal works' }));
    fireEvent.click(document.querySelector('.overlay')!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('swaps the name sheet for help and back for a new visitor', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    await screen.findByRole('dialog', { name: 'Help find a date for Fall camping trip' });
    fireEvent.click(screen.getByRole('button', { name: 'How it works' }));
    expect(screen.getByRole('dialog', { name: 'How SocialCal works' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Help find a date for Fall camping trip' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(await screen.findByRole('dialog', { name: 'Help find a date for Fall camping trip' })).toBeTruthy();
  });

  it('does not bring the name sheet back after help when just looking', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Just browse' }));
    fireEvent.click(screen.getByRole('button', { name: 'How SocialCal works' }));
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Viewing only')).toBeTruthy();
  });

  it('joins and becomes the current person right away', async () => {
    vi.mocked(api.getEvent)
      .mockResolvedValueOnce(payload)
      .mockResolvedValue(
        withMe({ participantId: 'M', isCreator: false }, { participants: [...payload.participants, { id: 'M', name: 'Maya', dates: [] }] }),
      );
    vi.mocked(api.join).mockResolvedValue({ participantId: 'M' });
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    fireEvent.input(await screen.findByLabelText('Your name'), { target: { value: 'Maya' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Maya', { selector: 'b.you' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit event' })).toBeNull();
  });

  it('refreshes instead of showing an error when this browser already joined', async () => {
    vi.mocked(api.getEvent)
      .mockResolvedValueOnce(payload)
      .mockResolvedValue(
        withMe({ participantId: 'M', isCreator: false }, { participants: [...payload.participants, { id: 'M', name: 'Maya', dates: [] }] }),
      );
    vi.mocked(api.join).mockRejectedValue(new ApiRequestError(409, 'already_joined', "You've already joined this calendar."));
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    fireEvent.input(await screen.findByLabelText('Your name'), { target: { value: 'Maya' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Maya', { selector: 'b.you' })).toBeTruthy();
    expect(screen.queryByText("You've already joined this calendar.")).toBeNull();
  });

  it('toasts and stops asking for a name when cookies are blocked', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    vi.mocked(api.join).mockResolvedValue({ participantId: 'M' });
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    fireEvent.input(await screen.findByLabelText('Your name'), { target: { value: 'Maya' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const blocked = "Cookies are blocked, so this browser can't remember you.";
    expect(await screen.findByText(blocked)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    // Once the toast times out, "Add my availability" must say why nothing happens instead of doing nothing.
    await waitFor(() => expect(screen.queryByText(blocked)).toBeNull(), { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: 'Add my availability' }));
    expect(await screen.findByText(blocked)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('claims the creator from the edit link without flashing the name sheet', async () => {
    history.replaceState(null, '', `/e/${ID}#edit=${KEY}`);
    // The follow-up GET never lands, so `me` can only come from the claim response.
    vi.mocked(api.getEvent).mockResolvedValueOnce(payload).mockImplementation(never);
    let resolveClaim!: (r: { participantId: string }) => void;
    vi.mocked(api.claimCreator).mockReturnValue(new Promise((r) => (resolveClaim = r)));
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    await screen.findAllByRole('heading', { name: 'Fall camping trip' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.claimCreator).toHaveBeenCalledWith(ID, KEY);
    resolveClaim({ participantId: 'J' });
    expect(await screen.findByText('Jorge', { selector: 'b.you' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit event' })).toBeTruthy();
    expect(location.hash).toBe('');
  });

  it('strips a bad edit link and toasts', async () => {
    history.replaceState(null, '', `/e/${ID}#edit=${KEY}`);
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    vi.mocked(api.claimCreator).mockRejectedValue(new ApiRequestError(403, 'edit_key_invalid', 'nope'));
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    expect(await screen.findByText("That edit link didn't work for this calendar.")).toBeTruthy();
    expect(location.hash).toBe('');
  });

  it('keeps the edit link and hides the name sheet when the claim hits a network error', async () => {
    history.replaceState(null, '', `/e/${ID}#edit=${KEY}`);
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    vi.mocked(api.claimCreator).mockRejectedValue(new ApiRequestError(0, 'network', 'Network error'));
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    expect(await screen.findByText("Couldn't check your edit link. Reload this page to try again.")).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(location.hash).toBe(`#edit=${KEY}`);
  });

  it('keeps the ready sheet until it is closed', async () => {
    markJustCreated(ID, KEY);
    vi.mocked(api.getEvent).mockResolvedValue(withMe(CREATOR));
    const { unmount } = render(<EventPage eventId={ID} navigate={vi.fn()} />);
    expect(await screen.findByRole('dialog', { name: 'Your calendar is ready' })).toBeTruthy();
    expect(screen.getByText(`${location.origin}/e/${ID}#edit=${KEY}`)).toBeTruthy();
    expect(peekJustCreated(ID)).toBe(KEY);
    // A fresh mount (reload) still shows the sheet until Done is tapped.
    unmount();
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    expect(await screen.findByRole('dialog', { name: 'Your calendar is ready' })).toBeTruthy();
    expect(screen.getByText(`${location.origin}/e/${ID}#edit=${KEY}`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(peekJustCreated(ID)).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders not found for unknown events', async () => {
    vi.mocked(api.getEvent).mockRejectedValue(new ApiRequestError(404, 'event_not_found', "This calendar doesn't exist."));
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    expect(await screen.findByText("This calendar doesn't exist")).toBeTruthy();
    expect(document.title).toBe('SocialCal');
  });

  it('offers a retry when loading fails', async () => {
    vi.mocked(api.getEvent).mockRejectedValueOnce(new ApiRequestError(0, 'network', 'Network error')).mockResolvedValue(payload);
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Fall camping trip' }).length).toBeGreaterThan(0));
  });

  describe('save failures', () => {
    const tap = (day: Element) => {
      fireEvent.pointerDown(day, { pointerType: 'mouse' });
      fireEvent.pointerUp(window);
    };
    const setup = async () => {
      vi.mocked(api.getEvent).mockResolvedValue(withMe(CREATOR));
      render(<EventPage eventId={ID} navigate={vi.fn()} />);
      await screen.findByText('Jorge', { selector: 'b.you' });
      vi.useFakeTimers();
      const day = document.querySelector('[data-date="2030-10-12"]');
      expect(day).toBeTruthy();
      return day as Element;
    };

    it('stops retrying, toasts, and refreshes on a 403', async () => {
      vi.mocked(api.updatePerson).mockRejectedValue(new ApiRequestError(403, 'forbidden', 'Nope'));
      const day = await setup();
      try {
        const gets = vi.mocked(api.getEvent).mock.calls.length;
        tap(day);
        await vi.advanceTimersByTimeAsync(700);
        expect(screen.getByText("This browser can't change these days anymore.")).toBeTruthy();
        expect(vi.mocked(api.getEvent).mock.calls.length).toBeGreaterThan(gets);
        await vi.advanceTimersByTimeAsync(100000);
        expect(api.updatePerson).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('shows the retry banner and retries on a network error', async () => {
      vi.mocked(api.updatePerson).mockRejectedValue(new ApiRequestError(0, 'network', 'Network error'));
      const day = await setup();
      try {
        tap(day);
        await vi.advanceTimersByTimeAsync(600);
        expect(screen.getByText("Couldn't save, retrying…")).toBeTruthy();
        await vi.advanceTimersByTimeAsync(2500);
        expect(vi.mocked(api.updatePerson).mock.calls.length).toBeGreaterThan(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
