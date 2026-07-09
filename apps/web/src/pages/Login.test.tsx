import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../i18n/index';

const { signIn, refresh } = vi.hoisted(() => ({ signIn: vi.fn(), refresh: vi.fn() }));
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ client: { signIn }, refresh }),
}));

import { Login } from './Login';

beforeEach(() => {
  signIn.mockReset();
  refresh.mockReset();
});

function renderLogin() {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe('Login page', () => {
  it('normalizes the phone and signs in', async () => {
    signIn.mockResolvedValue({ accessToken: 'a' });
    refresh.mockResolvedValue(undefined);
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('70 123 456'), { target: { value: '70123456' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Passw0rd' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('+96170123456', 'Passw0rd'));
  });

  it('shows a localized error when Cognito rejects', async () => {
    signIn.mockRejectedValue({ name: 'NotAuthorizedException' });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('70 123 456'), { target: { value: '70123456' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() =>
      expect(screen.getByText('Incorrect phone or password.')).toBeInTheDocument(),
    );
  });
});
