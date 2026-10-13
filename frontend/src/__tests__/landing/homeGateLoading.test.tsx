import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeGate } from '@modules/landing/ui/HomeGate';

jest.mock('@shared/hooks/useAuth', () => ({ useAuth: () => ({ status: 'loading' }) }));

describe('HomeGate while the session is being restored', () => {
  it('shows the splash screen: neither the presentation page nor the login', () => {
    const { container } = render(
      <MemoryRouter>
        <HomeGate />
      </MemoryRouter>
    );
    expect(container).not.toBeEmptyDOMElement();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });
});
