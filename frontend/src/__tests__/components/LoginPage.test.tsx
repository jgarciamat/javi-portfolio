import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '@modules/auth/ui/LoginPage';

const mockLogin = jest.fn().mockResolvedValue(undefined);

jest.mock('@shared/hooks/useAuth', () => ({
    useAuth: () => ({ login: mockLogin }),
}));

describe('LoginPage', () => {
    const mockOnSwitch = jest.fn();

    beforeEach(() => jest.clearAllMocks());

    test('renders email, password inputs and submit button', () => {
        render(<MemoryRouter><LoginPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
        expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
    });

    test('calls login with email and password on submit', async () => {
        render(<MemoryRouter><LoginPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'user@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'pass123' } });
        fireEvent.submit(screen.getByRole('button', { name: /Iniciar sesión/i }).closest('form')!);
        await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'pass123'));
    });

    test('shows error message when login fails', async () => {
        mockLogin.mockRejectedValueOnce(new Error('Credenciales inválidas'));
        render(<MemoryRouter><LoginPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'bad@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'wrong' } });
        fireEvent.submit(screen.getByRole('button', { name: /Iniciar sesión/i }).closest('form')!);
        await waitFor(() => expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument());
    });

    test('shows generic error for non-Error rejection', async () => {
        mockLogin.mockRejectedValueOnce('boom');
        render(<MemoryRouter><LoginPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'pw' } });
        fireEvent.submit(screen.getByRole('button', { name: /Iniciar sesión/i }).closest('form')!);
        await waitFor(() => expect(screen.getByText('Error al iniciar sesión')).toBeInTheDocument());
    });

    test('toggles password visibility', () => {
        render(<MemoryRouter><LoginPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        const passInput = screen.getByPlaceholderText('Contraseña');
        expect(passInput).toHaveAttribute('type', 'password');
        fireEvent.click(screen.getByLabelText('Mostrar contraseña'));
        expect(passInput).toHaveAttribute('type', 'text');
        fireEvent.click(screen.getByLabelText('Ocultar contraseña'));
        expect(passInput).toHaveAttribute('type', 'password');
    });

    test('calls onSwitch when register link is clicked', () => {
        render(<MemoryRouter><LoginPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        fireEvent.click(screen.getByText('Regístrate'));
        expect(mockOnSwitch).toHaveBeenCalled();
    });
});
