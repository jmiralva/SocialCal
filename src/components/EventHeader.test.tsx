import { render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { EventInfo } from '../../shared/types';
import { EventHeader } from './EventHeader';

describe('EventHeader', () => {
  it('links URLs in the description and opens them in a new tab', () => {
    const event = { name: 'Show', creatorName: 'Jorge', description: 'Promo: https://example.com/tix.' } as EventInfo;
    render(<EventHeader event={event} isCreator={false} onEdit={vi.fn()} />);
    const link = screen.getByRole('link', { name: 'https://example.com/tix' });
    expect(link.getAttribute('href')).toBe('https://example.com/tix');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.closest('.description')!.textContent).toBe('Promo: https://example.com/tix.');
  });
});
