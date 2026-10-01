import { fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HelpSheet } from './HelpSheet';
import { HelpLink } from './HelpLink';

describe('HelpSheet', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('is a labelled dialog that closes from Got it and the overlay', () => {
    const onClose = vi.fn();
    const { container } = render(<HelpSheet onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'How SocialCal works' })).toBeTruthy();
    const gotIt = screen.getByRole('button', { name: 'Got it' });
    expect(gotIt.getAttribute('type')).toBe('button');
    fireEvent.click(gotIt);
    fireEvent.click(container.querySelector('.overlay')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('explains drag and the keyboard for a mouse, and press-and-hold on touch', () => {
    const mockPointer = (coarse: boolean) =>
      vi.stubGlobal('matchMedia', (q: string) => ({ matches: coarse && q === '(pointer: coarse)' }));
    mockPointer(false);
    const { unmount } = render(<HelpSheet onClose={vi.fn()} />);
    expect(screen.getByText('Drag')).toBeTruthy();
    expect(screen.getByText('Use the arrow keys')).toBeTruthy();
    unmount();
    mockPointer(true);
    render(<HelpSheet onClose={vi.fn()} />);
    expect(screen.getByText('Press and hold')).toBeTruthy();
    expect(screen.queryByText('Use the arrow keys')).toBeNull();
  });

  it('explains the highlight and the circle', () => {
    render(<HelpSheet onClose={vi.fn()} />);
    expect(screen.getByText('Your days get a yellow highlight.')).toBeTruthy();
    expect(screen.queryByText(/Each mark on a day/)).toBeNull();
    expect(screen.getByText('The days with the most people free get circled.')).toBeTruthy();
    expect(screen.queryByText(/darker green/)).toBeNull();
  });

  it('links to the author and the repo', () => {
    render(<HelpSheet onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Jorge Mir Alvarez' }).getAttribute('href')).toBe('https://jmiralva.me');
    expect(screen.getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe('https://github.com/jmiralva/socialcal');
  });
});

describe('HelpLink', () => {
  it('is a non-submitting button named How it works', () => {
    const onClick = vi.fn();
    render(<HelpLink onClick={onClick} />);
    const link = screen.getByRole('button', { name: 'How it works' });
    expect(link.getAttribute('type')).toBe('button');
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
