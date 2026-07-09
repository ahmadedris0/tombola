import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from './i18n/index';
import App from './App';

vi.mock('./auth/AuthProvider', async () => {
  const actual = await vi.importActual<typeof import('./auth/AuthProvider')>('./auth/AuthProvider');
  return {
    ...actual,
    useAuth: () => ({ user: null, loading: false, token: null, client: {}, refresh: vi.fn(), signOut: vi.fn() }),
  };
});

describe('Admin app shell', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
    await i18n.changeLanguage('en');
  });

  it('shows the admin header and flips RTL', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Tombola Admin')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'العربية' }));
    expect(document.documentElement.dir).toBe('rtl');
  });
});
