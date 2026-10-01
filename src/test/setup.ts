import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/preact';

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
