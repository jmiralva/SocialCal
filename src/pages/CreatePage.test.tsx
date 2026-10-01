import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { CreatePage } from './CreatePage';
import { api } from '../lib/api';
import { peekJustCreated } from '../lib/storage';

vi.mock(import('../lib/api'), async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, api: { ...mod.api, createEvent: vi.fn() } };
});

const type = (label: string, value: string) => fireEvent.input(screen.getByLabelText(label), { target: { value } });

describe('CreatePage', () => {
  it('shows inline errors for missing fields', async () => {
    render(<CreatePage navigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create calendar' }));
    expect(await screen.findByText('Give the plan a name.')).toBeTruthy();
    expect(screen.getByText('Enter your name.')).toBeTruthy();
    expect(api.createEvent).not.toHaveBeenCalled();
  });

  it('creates the event, keeps the edit key for the ready sheet, and navigates', async () => {
    vi.mocked(api.createEvent).mockResolvedValue({ eventId: 'E'.repeat(22), editKey: 'K'.repeat(22) });
    const navigate = vi.fn();
    render(<CreatePage navigate={navigate} />);
    type("What's the plan?", '  Fall camping trip ');
    type('Description', 'Two nights');
    type('From', '2030-10-07');
    type('To', '2030-11-14');
    type('Your name', 'Jorge');
    fireEvent.click(screen.getByRole('button', { name: 'Create calendar' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(`/e/${'E'.repeat(22)}`));
    expect(api.createEvent).toHaveBeenCalledWith({
      name: 'Fall camping trip',
      description: 'Two nights',
      startDate: '2030-10-07',
      endDate: '2030-11-14',
      creatorName: 'Jorge',
    });
    expect(peekJustCreated('E'.repeat(22))).toBe('K'.repeat(22));
  });
});
