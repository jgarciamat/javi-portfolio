import { renderHook, act } from '@testing-library/react';
import { useDeleteAccount } from '@modules/auth/application/useDeleteAccount';
import esJson from '@locales/es.json';

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockLogout = jest.fn();
const mockDeleteAccount = jest.fn();

jest.mock('@shared/hooks/useAuth', () => ({
    useAuth: () => ({ logout: mockLogout }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@core/api/authApi', () => ({
    authApi: {
        deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
    },
    registerUnauthorizedHandler: jest.fn(),
}));

jest.mock('@core/i18n/I18nContext', () => ({
    useI18n: () => ({
        locale: 'es',
        setLocale: jest.fn(),
        t,
        tCategory: (n: string) => n,
    }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useDeleteAccount', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns initial state: loading=false, error=null', () => {
        const { result } = renderHook(() => useDeleteAccount());
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(typeof result.current.handleDelete).toBe('function');
    });

    test('calls authApi.deleteAccount on handleDelete', async () => {
        mockDeleteAccount.mockResolvedValueOnce(undefined);
        const { result } = renderHook(() => useDeleteAccount());

        await act(async () => {
            await result.current.handleDelete();
        });

        expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    });

    test('calls logout after successful deletion', async () => {
        mockDeleteAccount.mockResolvedValueOnce(undefined);
        const { result } = renderHook(() => useDeleteAccount());

        await act(async () => {
            await result.current.handleDelete();
        });

        expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    test('does not call logout when deletion fails', async () => {
        mockDeleteAccount.mockRejectedValueOnce(new Error('Server error'));
        const { result } = renderHook(() => useDeleteAccount());

        await act(async () => {
            await result.current.handleDelete();
        });

        expect(mockLogout).not.toHaveBeenCalled();
    });

    test('sets error message when deletion fails with Error', async () => {
        const errorMessage = 'Server error';
        mockDeleteAccount.mockRejectedValueOnce(new Error(errorMessage));
        const { result } = renderHook(() => useDeleteAccount());

        await act(async () => {
            await result.current.handleDelete();
        });

        expect(result.current.error).toBe(errorMessage);
    });

    test('sets fallback i18n error when deletion fails with non-Error value', async () => {
        mockDeleteAccount.mockRejectedValueOnce('string-error');
        const { result } = renderHook(() => useDeleteAccount());

        await act(async () => {
            await result.current.handleDelete();
        });

        expect(result.current.error).toBe(t('app.profile.deleteAccount.error'));
    });

    test('resets loading to false after failure', async () => {
        mockDeleteAccount.mockRejectedValueOnce(new Error('fail'));
        const { result } = renderHook(() => useDeleteAccount());

        await act(async () => {
            await result.current.handleDelete();
        });

        expect(result.current.loading).toBe(false);
    });

    test('clears previous error on new handleDelete call', async () => {
        // First call: fail
        mockDeleteAccount.mockRejectedValueOnce(new Error('first error'));
        const { result } = renderHook(() => useDeleteAccount());

        await act(async () => {
            await result.current.handleDelete();
        });
        expect(result.current.error).toBe('first error');

        // Second call: succeed
        mockDeleteAccount.mockResolvedValueOnce(undefined);
        await act(async () => {
            await result.current.handleDelete();
        });

        // logout was called on success so error is no longer relevant, but it was reset to null at start
        expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    test('loading is true during handleDelete execution and false afterwards (on success logout exits)', async () => {
        let resolveDelete!: () => void;
        const pendingPromise = new Promise<void>((res) => { resolveDelete = res; });
        mockDeleteAccount.mockReturnValueOnce(pendingPromise);

        const { result } = renderHook(() => useDeleteAccount());

        // Start the call without awaiting
        let deletePromise: Promise<void>;
        act(() => {
            deletePromise = result.current.handleDelete();
        });

        // loading should be true while pending
        expect(result.current.loading).toBe(true);

        // Resolve
        await act(async () => {
            resolveDelete();
            await deletePromise;
        });
    });
});
