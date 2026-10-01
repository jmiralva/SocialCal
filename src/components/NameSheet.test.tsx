import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { NameSheet } from './NameSheet';

const props = () => ({
  title: 'Fall camping trip',
  subtitle: "What's your name? Then tap the days you're available.",
  submitLabel: 'Continue',
  onSubmit: vi.fn(async () => null),
  secondary: { label: 'Just browse', onClick: vi.fn() },
});

describe('NameSheet', () => {
  it('marks the name field invalid when the name is missing', async () => {
    render(<NameSheet {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const input = screen.getByLabelText('Your name');
    expect(await screen.findByText('Enter your name.')).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('name-error');
    expect(document.getElementById('name-error')!.textContent).toBe('Enter your name.');
  });

  it('does not mark a valid name invalid when the server call fails', async () => {
    const onSubmit = vi.fn(async () => "Couldn't save. Try again.");
    render(<NameSheet {...props()} onSubmit={onSubmit} initialName="Jorge" />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText("Couldn't save. Try again.")).toBeTruthy();
    const input = screen.getByLabelText('Your name');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBe('name-error');
  });

  it('has no How it works link without onHelp', () => {
    render(<NameSheet {...props()} />);
    expect(screen.queryByRole('button', { name: 'How it works' })).toBeNull();
  });

  it('calls onHelp without submitting the name', () => {
    const p = props();
    const onHelp = vi.fn();
    render(<NameSheet {...p} onHelp={onHelp} />);
    fireEvent.click(screen.getByRole('button', { name: 'How it works' }));
    expect(onHelp).toHaveBeenCalledOnce();
    expect(p.onSubmit).not.toHaveBeenCalled();
  });

  it('focuses the name field on a fine pointer', () => {
    render(<NameSheet {...props()} />);
    expect(document.activeElement).toBe(screen.getByLabelText('Your name'));
  });

  it('takes Escape as the secondary action but ignores overlay clicks', () => {
    const p = props();
    const { container } = render(<NameSheet {...p} />);
    fireEvent.click(container.querySelector('.overlay')!);
    expect(p.secondary.onClick).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(p.secondary.onClick).toHaveBeenCalledOnce();
  });
});
