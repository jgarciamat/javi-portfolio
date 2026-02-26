import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '@modules/auth/ui/RegisterPage';

const mockRegister = jest.fn().mockResolvedValue('Registro exitoso. Revisa tu email para verificar tu cuenta.');

jest.mock('@shared/hooks/useAuth', () => ({
    useAuth: () => ({ register: mockRegister }),
}));

describe('RegisterPage', () => {
    const mockOnSwitch = jest.fn();

    beforeEach(() => jest.clearAllMocks());

    test('renders name, email, password inputs and submit button', () => {
        render(<MemoryRouter><RegisterPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        expect(screen.getByPlaceholderText('Nombre')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
        expect(screen.getByText('Crear cuenta')).toBeInTheDocument();
    });

    test('calls register with correct args on submit', async () => {
        render(<MemoryRouter><RegisterPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'John' } });
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'j@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'secret' } });
        fireEvent.submit(screen.getByRole('button', { name: /Crear cuenta/i }).closest('form')!);
        await waitFor(() => expect(mockRegister).toHaveBeenCalledWith('j@test.com', 'secret', 'John'));
    });

    test('shows email confirmation screen after successful registration', async () => {
        render(<MemoryRouter><RegisterPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'John' } });
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'j@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'secret' } });
        fireEvent.submit(screen.getByRole('button', { name: /Crear cuenta/i }).closest('form')!);
        await waitFor(() => expect(screen.getByText('¡Revisa tu email!')).toBeInTheDocument());
        expect(screen.getByText('j@test.com')).toBeInTheDocument();
    });

    test('confirmation screen "Ir a iniciar sesión" calls onSwitch', async () => {
        render(<MemoryRouter><RegisterPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'John' } });
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'j@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'secret' } });
        fireEvent.submit(screen.getByRole('button', { name: /Crear cuenta/i }).closest('form')!);
        await waitFor(() => expect(screen.getByText('Ir a iniciar sesión')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Ir a iniciar sesión'));
        expect(mockOnSwitch).toHaveBeenCalled();
    });

    test('shows error when register fails', async () => {
        mockRegister.mockRejectedValueOnce(new Error('Email already exists'));
        render(<MemoryRouter><RegisterPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'X' } });
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'x@x.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'pw' } });
        fireEvent.submit(screen.getByRole('button', { name: /Crear cuenta/i }).closest('form')!);
        await waitFor(() => expect(screen.getByText('Email already exists')).toBeInTheDocument());
    });

    test('shows generic error for non-Error rejection', async () => {
        mockRegister.mockRejectedValueOnce('boom');
        render(<MemoryRouter><RegisterPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'X' } });
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'x@x.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'pw' } });
        fireEvent.submit(screen.getByRole('button', { name: /Crear cuenta/i }).closest('form')!);
        await waitFor(() => expect(screen.getByText('Error al crear la cuenta')).toBeInTheDocument());
    });

    test('toggles password visibility', () => {
        render(<MemoryRouter><RegisterPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        const passInput = screen.getByPlaceholderText('Contraseña');
        expect(passInput).toHaveAttribute('type', 'password');
        fireEvent.click(screen.getByLabelText('Mostrar contraseña'));
        expect(passInput).toHaveAttribute('type', 'text');
    });

    test('calls onSwitch when login link is clicked', () => {
        render(<MemoryRouter><RegisterPage onSwitch={mockOnSwitch} /></MemoryRouter>);
        fireEvent.click(screen.getByText('Inicia sesión'));
        expect(mockOnSwitch).toHaveBeenCalled();
    });
});
