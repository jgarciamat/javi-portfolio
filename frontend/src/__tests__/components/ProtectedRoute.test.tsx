import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

jest.mock('@shared/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '@shared/hooks/useAuth';

const mockUseAuth = useAuth as jest.Mock;

describe('ProtectedRoute', () => {
  test('renders Outlet when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, status: 'authenticated' });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  test('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, status: 'anonymous' });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  test('waits (no redirect) while a stored session is being restored', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, status: 'loading' });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).toBeNull();
    expect(screen.queryByText('Protected Content')).toBeNull();
  });
});
