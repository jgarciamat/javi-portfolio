import { screen } from '@testing-library/react';
import { DeleteAccountModal } from '@modules/auth/ui/DeleteAccountModal';
import { AuthPage } from '@shared/components/AuthPage';
import { renderWithProviders, tr } from '@test-utils/render';

// A build without VITE_GOOGLE_CLIENT_ID (local setups, CI).
jest.mock('@core/config/api.config', () => ({
  API_BASE_URL: 'http://localhost:3000/api',
  GOOGLE_CLIENT_ID: '',
}));

describe('Google sign-in without a client id', () => {
  it('is hidden instead of breaking the login and register pages', () => {
    const { unmount } = renderWithProviders(<AuthPage />, {
      authenticated: false,
      route: '/login',
    });
    expect(screen.getByRole('button', { name: tr('app.auth.login.submit') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: tr('app.auth.login.google') })).toBeNull();
    expect(screen.queryByText(tr('app.auth.login.orDivider'))).toBeNull();
    unmount();
    renderWithProviders(<AuthPage />, { authenticated: false, route: '/login?mode=register' });
    expect(screen.queryByRole('button', { name: tr('app.auth.register.google') })).toBeNull();
  });

  it('leaves only the direct confirmation when deleting a Google-only account', () => {
    renderWithProviders(
      <DeleteAccountModal
        loading={false}
        error={null}
        hasPassword={false}
        playActive={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
      { finances: false }
    );
    expect(screen.getByText(tr('app.profile.deleteAccount.google'))).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: tr('app.profile.deleteAccount.googleConfirm') })
    ).toBeNull();
  });
});
