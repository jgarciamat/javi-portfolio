import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthPage } from '@shared/components/AuthPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

jest.mock('@shared/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}));

import { useAuth } from '@shared/hooks/useAuth';
const mockUseAuth = useAuth as jest.Mock;

describe('AuthPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue({ isAuthenticated: false });
    });

    test('renders LoginPage by default', () => {
        render(<MemoryRouter><AuthPage /></MemoryRouter>);
        expect(screen.getByText(/Inicia sesión en tu cuenta/i)).toBeInTheDocument();
    });

    test('switches to RegisterPage when onSwitch is called', () => {
        render(<MemoryRouter><AuthPage /></MemoryRouter>);
        // Click "Regístrate" link
        fireEvent.click(screen.getByText('Regístrate'));
        expect(screen.getByText(/Crea tu cuenta gratuita/i)).toBeInTheDocument();
    });

    test('switches back to LoginPage from RegisterPage', () => {
        render(<MemoryRouter><AuthPage /></MemoryRouter>);
        fireEvent.click(screen.getByText('Regístrate'));
        fireEvent.click(screen.getByText('Inicia sesión'));
        expect(screen.getByText(/Inicia sesión en tu cuenta/i)).toBeInTheDocument();
    });

    test('navigates to / when already authenticated', () => {
        mockUseAuth.mockReturnValue({ isAuthenticated: true });
        render(<MemoryRouter><AuthPage /></MemoryRouter>);
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
});
