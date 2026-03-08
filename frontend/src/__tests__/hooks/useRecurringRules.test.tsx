import { renderHook, act, waitFor } from '@testing-library/react';
import { useRecurringRules } from '../../modules/finances/application/hooks/useRecurringRules';
import type { RecurringRule } from '../../modules/finances/domain/types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@core/context/ApiContext', () => ({ useApi: jest.fn() }));
jest.mock('@shared/hooks/useAuth', () => ({ useAuth: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useApi } = require('@core/context/ApiContext') as { useApi: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth } = require('@shared/hooks/useAuth') as { useAuth: jest.Mock };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ruleA: RecurringRule = {
    id: 'r1',
    userId: 'u1',
    description: 'Netflix',
    amount: 12.99,
    type: 'EXPENSE',
    category: 'Ocio',
    startYear: 2026,
    startMonth: 1,
    endYear: null,
    endMonth: null,
    frequency: 'monthly',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
};

const ruleB: RecurringRule = {
    id: 'r2',
    userId: 'u1',
    description: 'Sueldo',
    amount: 2000,
    type: 'INCOME',
    category: 'Trabajo',
    startYear: 2026,
    startMonth: 1,
    endYear: null,
    endMonth: null,
    frequency: 'monthly',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
};

// ── Setup helpers ─────────────────────────────────────────────────────────────

const mockRecurringApi = {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
};

function setupMocks(token: string | null = 'tok') {
    useAuth.mockReturnValue({ token });
    useApi.mockReturnValue({ recurringApi: mockRecurringApi });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useRecurringRules', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('fetches rules on mount when token is present', async () => {
        setupMocks('tok');
        mockRecurringApi.getAll.mockResolvedValue([ruleA, ruleB]);

        const { result } = renderHook(() => useRecurringRules());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(mockRecurringApi.getAll).toHaveBeenCalledTimes(1);
        expect(result.current.rules).toEqual([ruleA, ruleB]);
        expect(result.current.error).toBeNull();
    });

    test('does not fetch rules when token is null', async () => {
        setupMocks(null);

        const { result } = renderHook(() => useRecurringRules());

        // Give any potential async work time to settle
        await act(async () => { });

        expect(mockRecurringApi.getAll).not.toHaveBeenCalled();
        expect(result.current.rules).toEqual([]);
        expect(result.current.loading).toBe(false);
    });

    test('sets error state when getAll fails', async () => {
        setupMocks('tok');
        mockRecurringApi.getAll.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useRecurringRules());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Network error');
        expect(result.current.rules).toEqual([]);
    });

    test('createRule adds the new rule to state', async () => {
        setupMocks('tok');
        mockRecurringApi.getAll.mockResolvedValue([ruleA]);
        mockRecurringApi.create.mockResolvedValue(ruleB);

        const { result } = renderHook(() => useRecurringRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.createRule({
                description: 'Sueldo',
                amount: 2000,
                type: 'INCOME',
                category: 'Trabajo',
                startYear: 2026,
                startMonth: 1,
            });
        });

        expect(result.current.rules).toEqual([ruleA, ruleB]);
    });

    test('updateRule replaces the updated rule in state', async () => {
        setupMocks('tok');
        mockRecurringApi.getAll.mockResolvedValue([ruleA, ruleB]);
        const updatedA = { ...ruleA, active: false };
        mockRecurringApi.update.mockResolvedValue(updatedA);

        const { result } = renderHook(() => useRecurringRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.updateRule('r1', { active: false });
        });

        expect(result.current.rules.find((r) => r.id === 'r1')?.active).toBe(false);
        expect(result.current.rules).toHaveLength(2);
    });

    test('deleteRule removes the rule from state', async () => {
        setupMocks('tok');
        mockRecurringApi.getAll.mockResolvedValue([ruleA, ruleB]);
        mockRecurringApi.delete.mockResolvedValue(undefined);

        const { result } = renderHook(() => useRecurringRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.deleteRule('r1');
        });

        expect(result.current.rules).toHaveLength(1);
        expect(result.current.rules[0].id).toBe('r2');
    });

    test('toggleActive calls updateRule with {active}', async () => {
        setupMocks('tok');
        mockRecurringApi.getAll.mockResolvedValue([ruleA]);
        const paused = { ...ruleA, active: false };
        mockRecurringApi.update.mockResolvedValue(paused);

        const { result } = renderHook(() => useRecurringRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.toggleActive('r1', false);
        });

        expect(mockRecurringApi.update).toHaveBeenCalledWith('r1', { active: false });
        expect(result.current.rules[0].active).toBe(false);
    });

    test('refresh re-fetches rules from API', async () => {
        setupMocks('tok');
        mockRecurringApi.getAll.mockResolvedValueOnce([ruleA]).mockResolvedValueOnce([ruleA, ruleB]);

        const { result } = renderHook(() => useRecurringRules());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.rules).toHaveLength(1);

        await act(async () => {
            await result.current.refresh();
        });

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.rules).toHaveLength(2);
        expect(mockRecurringApi.getAll).toHaveBeenCalledTimes(2);
    });

    test('deleteRule passes scope="none" by default to recurringApi.delete', async () => {
        setupMocks('tok');
        mockRecurringApi.getAll.mockResolvedValue([ruleA]);
        mockRecurringApi.delete.mockResolvedValue(undefined);

        const { result } = renderHook(() => useRecurringRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.deleteRule('r1');
        });

        expect(mockRecurringApi.delete).toHaveBeenCalledWith('r1', 'none');
    });

    test('deleteRule passes scope="all" to recurringApi.delete', async () => {
        setupMocks('tok');
        mockRecurringApi.getAll.mockResolvedValue([ruleA]);
        mockRecurringApi.delete.mockResolvedValue(undefined);

        const { result } = renderHook(() => useRecurringRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.deleteRule('r1', 'all');
        });

        expect(mockRecurringApi.delete).toHaveBeenCalledWith('r1', 'all');
    });

    test('deleteRule passes scope="from_current" to recurringApi.delete', async () => {
        setupMocks('tok');
        mockRecurringApi.getAll.mockResolvedValue([ruleA]);
        mockRecurringApi.delete.mockResolvedValue(undefined);

        const { result } = renderHook(() => useRecurringRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.deleteRule('r1', 'from_current');
        });

        expect(mockRecurringApi.delete).toHaveBeenCalledWith('r1', 'from_current');
    });
});
