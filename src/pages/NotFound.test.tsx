import { render } from '@testing-library/preact';
import { expect, it, vi } from 'vitest';
import { NotFound } from './NotFound';

it('sets the tab title to the plain brand', () => {
  document.title = '';
  render(<NotFound navigate={vi.fn()} />);
  expect(document.title).toBe('SocialCal');
});
