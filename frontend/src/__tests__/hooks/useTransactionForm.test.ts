import { renderHook, act } from '@testing-library/react';
import { useTransactionForm } from '@modules/finances/application/hooks/useTransactionForm';

const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
const mockManage = jest.fn();

const defaultOpts = {
    viewYear: 2025,
    viewMonth: 1,
    availableBalance: 1000,
    onSubmit: mockOnSubmit,
};

describe('useTransactionForm', () => {
    beforeEach(() => jest.clearAllMocks());

    test('initialises with default values', () => {
        const { result } = renderHook(() => useTransactionForm(defaultOpts));
        expect(result.current.fields.type).toBe('EXPENSE');
        expect(result.current.fields.description).toBe('');
        expect(result.current.fields.amount).toBe('');
        expect(result.current.fields.category).toBe('');
    });

    test('handleSubmit shows error when fields are empty', async () => {
        const { result } = renderHook(() => useTransactionForm(defaultOpts));
        const fakeEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
        await act(async () => { result.current.handleSubmit(fakeEvent); });
        expect(result.current.error).toBe('Rellena todos los campos');
        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('handleSubmit shows insufficient balance error', async () => {
        const { result } = renderHook(() => useTransactionForm({ ...defaultOpts, availableBalance: 5 }));
        act(() => {
            result.current.setDescription('Test');
            result.current.setAmount('100');
            result.current.setCategory('Food');
        });
        const fakeEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
        await act(async () => { result.current.handleSubmit(fakeEvent); });
        expect(result.current.error).toMatch(/Saldo insuficiente/);
    });

    test('handleSubmit calls onSubmit with correct DTO on success', async () => {
        const { result } = renderHook(() => useTransactionForm(defaultOpts));
        act(() => {
            result.current.setDescription('Groceries');
            result.current.setAmount('50');
            result.current.setCategory('Food');
            result.current.setDate('2025-01-15');
        });
        const fakeEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
        await act(async () => { result.current.handleSubmit(fakeEvent); });
        expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({ description: 'Groceries', amount: 50, type: 'EXPENSE', category: 'Food' })
        );
        // Fields reset after success
        expect(result.current.fields.description).toBe('');
    });

    test('handleSubmit shows API error when onSubmit throws', async () => {
        mockOnSubmit.mockRejectedValueOnce(new Error('Server error'));
        const { result } = renderHook(() => useTransactionForm(defaultOpts));
        act(() => {
            result.current.setDescription('Test');
            result.current.setAmount('10');
            result.current.setCategory('Food');
        });
        const fakeEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
        await act(async () => { result.current.handleSubmit(fakeEvent); });
        expect(result.current.error).toBe('Server error');
    });

    test('handleSubmit shows generic error for non-Error rejection', async () => {
        mockOnSubmit.mockRejectedValueOnce('boom');
        const { result } = renderHook(() => useTransactionForm(defaultOpts));
        act(() => {
            result.current.setDescription('Test');
            result.current.setAmount('10');
            result.current.setCategory('Food');
        });
        const fakeEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
        await act(async () => { result.current.handleSubmit(fakeEvent); });
        expect(result.current.error).toBe('Error al crear la transacción');
    });

    test('handleCategoryChange opens manage dialog for __manage__', () => {
        const { result } = renderHook(() => useTransactionForm(defaultOpts));
        act(() => result.current.handleCategoryChange('__manage__', mockManage));
        expect(mockManage).toHaveBeenCalled();
        expect(result.current.fields.category).toBe(''); // unchanged
    });

    test('handleCategoryChange sets category for regular value', () => {
        const { result } = renderHook(() => useTransactionForm(defaultOpts));
        act(() => result.current.handleCategoryChange('Food', mockManage));
        expect(result.current.fields.category).toBe('Food');
    });

    test('SAVING type also triggers insufficient balance check', async () => {
        const { result } = renderHook(() => useTransactionForm({ ...defaultOpts, availableBalance: 5 }));
        act(() => {
            result.current.setDescription('Savings');
            result.current.setAmount('100');
            result.current.setType('SAVING');
            result.current.setCategory('Savings');
        });
        const fakeEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
        await act(async () => { result.current.handleSubmit(fakeEvent); });
        expect(result.current.error).toMatch(/Saldo insuficiente/);
    });

    test('INCOME type ignores balance check', async () => {
        const { result } = renderHook(() => useTransactionForm({ ...defaultOpts, availableBalance: 0 }));
        act(() => {
            result.current.setDescription('Salary');
            result.current.setAmount('5000');
            result.current.setType('INCOME');
            result.current.setCategory('Salary');
        });
        const fakeEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
        await act(async () => { result.current.handleSubmit(fakeEvent); });
        expect(mockOnSubmit).toHaveBeenCalled();
    });

    test('getDefaultDate returns today when viewYear/viewMonth is current month', () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const { result } = renderHook(() =>
            useTransactionForm({ ...defaultOpts, viewYear: currentYear, viewMonth: currentMonth })
        );
        const todayStr = now.toISOString().split('T')[0];
        expect(result.current.fields.date).toBe(todayStr);
    });
});
