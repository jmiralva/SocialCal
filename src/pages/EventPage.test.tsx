import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { EventPage } from './EventPage';
import { api, ApiRequestError } from '../lib/api';
import { saveIdentity } from '../lib/storage';
import type { EventPayload } from '../../shared/types';

vi.mock(import('../lib/api'), async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    api: { ...mod.api, getEvent: vi.fn(), join: vi.fn(), updatePerson: vi.fn(), updateEvent: vi.fn(), claimCreator: vi.fn() },
  };
});

const ID = 'E'.repeat(22);
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
};

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

  it('shows the creator their marking bar and edit link', async () => {
    saveIdentity(ID, { participantId: 'J', token: 'T'.repeat(22), editKey: 'K'.repeat(22) });
    vi.mocked(api.getEvent).mockResolvedValue(payload);
    render(<EventPage eventId={ID} navigate={vi.fn()} />);
    expect(await screen.findByText('Jorge', { selector: 'b.you' })).toBeTruthy();
    expect(screen.getByText(/· 1 day$/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit event' })).toBeTruthy();
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
});
