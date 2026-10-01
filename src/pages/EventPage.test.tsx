import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
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
  for (const fn of [api.getEvent, api.join, api.updatePerson, api.updateEvent, api.claimCreator]) vi.mocked(fn).mockReset();
});
afterEach(() => history.replaceState(null, '', '/'));

describe('EventPage', () => {
  it('asks a new visitor for their name and supports just looking', async () => {
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    expect(await screen.findByRole('dialog', { name: 'Fall camping trip' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Just look' }));
    expect(screen.getByText('Viewing only')).toBeTruthy();
    expect(screen.getByText('Created by')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit event' })).toBeNull();
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
    expect(await screen.findByText("Cookies are blocked, so this browser can't remember you.")).toBeTruthy();
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
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    expect(await screen.findByRole('dialog', { name: 'Your calendar is ready' })).toBeTruthy();
    expect(screen.getByText(`${location.origin}/e/${ID}#edit=${KEY}`)).toBeTruthy();
    expect(peekJustCreated(ID)).toBe(KEY);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(peekJustCreated(ID)).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders not found for unknown events', async () => {
    vi.mocked(api.getEvent).mockRejectedValue(new ApiRequestError(404, 'event_not_found', "This calendar doesn't exist."));
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    expect(await screen.findByText("This calendar doesn't exist")).toBeTruthy();
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
