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
  it('marks invalid fields and points them at their error', async () => {
    render(<CreatePage navigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create calendar' }));
    await screen.findByText('Give the plan a name.');
    // The error sits inside the <label>, so the label text now ends with it: match the start only.
    const plan = screen.getByLabelText(/^What's the plan\?/);
    expect(plan.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(plan.getAttribute('aria-describedby')!)!.textContent).toBe('Give the plan a name.');
    const name = screen.getByLabelText(/^Your name/);
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(name.getAttribute('aria-describedby')!)!.textContent).toBe('Enter your name.');
    expect(screen.getByLabelText('Description').getAttribute('aria-invalid')).toBeNull();
  });

  it('opens and closes help without submitting the form', () => {
    vi.mocked(api.createEvent).mockClear();
    render(<CreatePage navigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'How it works' }));
    expect(screen.getByRole('dialog', { name: 'How socialcal works' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Give the plan a name.')).toBeNull();
    expect(api.createEvent).not.toHaveBeenCalled();
  });

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
