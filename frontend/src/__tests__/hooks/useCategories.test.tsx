import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useCategories } from '../../modules/finances/application/hooks/useCategories';

const mockGetAll = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@shared/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}));

jest.mock('@core/context/ApiContext', () => ({
    useApi: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useApi } = require('@core/context/ApiContext') as { useApi: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth } = require('@shared/hooks/useAuth') as { useAuth: jest.Mock };

function TestComponent() {
    const { categories, loading, addCategory, removeCategory, refresh } = useCategories();
    return (
        <div>
            <div data-testid="count">{categories.length}</div>
            <div data-testid="loading">{String(loading)}</div>
            <div data-testid="first">{categories[0]?.name ?? 'none'}</div>
            <button onClick={() => addCategory({ name: 'Transport', icon: '🚗' })}>add</button>
            <button onClick={() => removeCategory('c1')}>del</button>
            <button onClick={refresh}>refresh</button>
        </div>
    );
}

describe('useCategories', () => {
    const stableCategoryApi = { getAll: mockGetAll, create: mockCreate, delete: mockDelete };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAll.mockResolvedValue([
            { id: 'c1', name: 'Food', color: '#ff0000', icon: '🍔' },
            { id: 'c2', name: 'Beer', color: '#0000ff', icon: '🍺' },
        ]);
        mockCreate.mockResolvedValue({ id: 'c3', name: 'Transport', color: '#00ff00', icon: '🚗' });
        mockDelete.mockResolvedValue(undefined);

        useApi.mockReturnValue({ categoryApi: stableCategoryApi });

        // Default: authenticated user
        useAuth.mockReturnValue({ token: 'tok-test' });
    });

    test('fetches categories on mount', async () => {
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    });

    test('addCategory appends and re-sorts', async () => {
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
        fireEvent.click(screen.getByText('add'));
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));
        expect(mockCreate).toHaveBeenCalledWith({ name: 'Transport', icon: '🚗' });
    });

    test('removeCategory removes by id', async () => {
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
        fireEvent.click(screen.getByText('del'));
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
        expect(mockDelete).toHaveBeenCalledWith('c1');
    });

    test('refresh re-fetches categories', async () => {
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
        fireEvent.click(screen.getByText('refresh'));
        await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(2));
    });

    test('silently sets empty array when fetch fails', async () => {
        mockGetAll.mockRejectedValueOnce(new Error('fail'));
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
        expect(screen.getByTestId('count').textContent).toBe('0');
    });

    test('does not fetch when token is null', async () => {
        useAuth.mockReturnValue({ token: null });
        render(<TestComponent />);
        // loading should stay false and no API call should be made
        await new Promise((r) => setTimeout(r, 50));
        expect(mockGetAll).not.toHaveBeenCalled();
        expect(screen.getByTestId('count').textContent).toBe('0');
    });
});
