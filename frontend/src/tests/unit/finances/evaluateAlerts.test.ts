import { evaluateAlerts } from '@modules/finances/application/hooks/useCustomAlerts';
import type { CustomAlert } from '@modules/finances/domain/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let idCounter = 0;
function makeAlert(overrides: Partial<CustomAlert>): CustomAlert {
    idCounter++;
    return {
        id: `a${idCounter}`,
        userId: 'u1',
        name: 'Test alert',
        metric: 'expenses_pct',
        operator: 'gte',
        threshold: 80,
        category: null,
        color: '#6366f1',
        active: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    };
}

const baseInput = {
    totalExpenses: 800,
    totalIncome: 1000,
    totalSaving: 100,
    balance: 300,
    carryover: 200,
    expensesByCategory: { Ocio: 300, Alimentación: 200 },
};

// ─── expenses_pct ─────────────────────────────────────────────────────────────

describe('evaluateAlerts – expenses_pct', () => {
    it('triggers when expenses >= threshold % of available', () => {
        // available = carryover(200) + income(1000) = 1200
        // expenses_pct = 800/1200 * 100 ≈ 66.67%
        const alert = makeAlert({ metric: 'expenses_pct', operator: 'gte', threshold: 60 });
        const result = evaluateAlerts([alert], baseInput);
        expect(result).toHaveLength(1);
        expect(result[0].alert.id).toBe(alert.id);
        expect(result[0].currentValue).toBeCloseTo(66.67, 1);
    });

    it('does not trigger when expenses < threshold', () => {
        const alert = makeAlert({ metric: 'expenses_pct', operator: 'gte', threshold: 70 });
        const result = evaluateAlerts([alert], baseInput);
        expect(result).toHaveLength(0);
    });

    it('triggers lte when expenses <= threshold', () => {
        const alert = makeAlert({ metric: 'expenses_pct', operator: 'lte', threshold: 70 });
        const result = evaluateAlerts([alert], baseInput);
        expect(result).toHaveLength(1);
    });
});

// ─── saving_pct ───────────────────────────────────────────────────────────────

describe('evaluateAlerts – saving_pct', () => {
    it('triggers when saving >= threshold % of income', () => {
        // saving_pct = 100/1000 * 100 = 10%
        const alert = makeAlert({ metric: 'saving_pct', operator: 'gte', threshold: 10 });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(1);
    });

    it('does not trigger when saving < threshold', () => {
        const alert = makeAlert({ metric: 'saving_pct', operator: 'gte', threshold: 15 });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(0);
    });

    it('lte triggers when saving <= threshold', () => {
        const alert = makeAlert({ metric: 'saving_pct', operator: 'lte', threshold: 10 });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(1);
    });
});

// ─── balance_pct ─────────────────────────────────────────────────────────────

describe('evaluateAlerts – balance_pct', () => {
    it('triggers when balance <= threshold % of available', () => {
        // balance_pct = 300/1200 * 100 = 25%
        const alert = makeAlert({ metric: 'balance_pct', operator: 'lte', threshold: 30 });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(1);
    });

    it('does not trigger when condition is not met', () => {
        const alert = makeAlert({ metric: 'balance_pct', operator: 'gte', threshold: 50 });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(0);
    });
});

// ─── balance_amount ──────────────────────────────────────────────────────────

describe('evaluateAlerts – balance_amount', () => {
    it('triggers lte when balance drops below amount', () => {
        const alert = makeAlert({ metric: 'balance_amount', operator: 'lte', threshold: 300 });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(1);
    });

    it('does not trigger lte when balance is above threshold', () => {
        const alert = makeAlert({ metric: 'balance_amount', operator: 'lte', threshold: 299 });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(0);
    });

    it('triggers gte when balance is above threshold', () => {
        const alert = makeAlert({ metric: 'balance_amount', operator: 'gte', threshold: 300 });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(1);
    });
});

// ─── category_pct ────────────────────────────────────────────────────────────

describe('evaluateAlerts – category_pct', () => {
    it('triggers when category expenses >= threshold % of available', () => {
        // Ocio = 300, available = 1200, pct = 25%
        const alert = makeAlert({ metric: 'category_pct', operator: 'gte', threshold: 20, category: 'Ocio' });
        const result = evaluateAlerts([alert], baseInput);
        expect(result).toHaveLength(1);
        expect(result[0].currentValue).toBeCloseTo(25, 1);
    });

    it('does not trigger for category with no spending', () => {
        const alert = makeAlert({ metric: 'category_pct', operator: 'gte', threshold: 1, category: 'Vivienda' });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(0);
    });

    it('skips category_pct alert with no category set', () => {
        const alert = makeAlert({ metric: 'category_pct', operator: 'gte', threshold: 10, category: null });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(0);
    });
});

// ─── category_amount ─────────────────────────────────────────────────────────

describe('evaluateAlerts – category_amount', () => {
    it('triggers when category spending >= threshold amount', () => {
        // Ocio = 300€
        const alert = makeAlert({ metric: 'category_amount', operator: 'gte', threshold: 250, category: 'Ocio' });
        const result = evaluateAlerts([alert], baseInput);
        expect(result).toHaveLength(1);
        expect(result[0].currentValue).toBe(300);
    });

    it('does not trigger when category spending < threshold', () => {
        const alert = makeAlert({ metric: 'category_amount', operator: 'gte', threshold: 350, category: 'Ocio' });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(0);
    });

    it('triggers lte when category spending <= threshold', () => {
        const alert = makeAlert({ metric: 'category_amount', operator: 'lte', threshold: 300, category: 'Ocio' });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(1);
    });

    it('returns 0 for a category with no spending', () => {
        const alert = makeAlert({ metric: 'category_amount', operator: 'gte', threshold: 1, category: 'Vivienda' });
        // Vivienda no está en expensesByCategory → currentValue = 0 → 0 >= 1 false
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(0);
    });

    it('skips category_amount alert with no category set', () => {
        const alert = makeAlert({ metric: 'category_amount', operator: 'gte', threshold: 100, category: null });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(0);
    });
});

// ─── income_pct ──────────────────────────────────────────────────────────────

describe('evaluateAlerts – income_pct', () => {
    it('triggers when income >= threshold % of carryover', () => {
        // income_pct = 1000/200 * 100 = 500%
        const alert = makeAlert({ metric: 'income_pct', operator: 'gte', threshold: 400 });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(1);
    });

    it('does not trigger when income < threshold', () => {
        const alert = makeAlert({ metric: 'income_pct', operator: 'gte', threshold: 600 });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(0);
    });

    it('skips evaluation when carryover is 0', () => {
        const alert = makeAlert({ metric: 'income_pct', operator: 'gte', threshold: 10 });
        const inputNoCarryover = { ...baseInput, carryover: 0 };
        expect(evaluateAlerts([alert], inputNoCarryover)).toHaveLength(0);
    });
});

// ─── General behaviour ───────────────────────────────────────────────────────

describe('evaluateAlerts – general', () => {
    it('skips inactive alerts', () => {
        const alert = makeAlert({ metric: 'expenses_pct', operator: 'gte', threshold: 50, active: false });
        expect(evaluateAlerts([alert], baseInput)).toHaveLength(0);
    });

    it('evaluates multiple alerts independently', () => {
        const a1 = makeAlert({ metric: 'expenses_pct', operator: 'gte', threshold: 60 }); // triggers
        const a2 = makeAlert({ metric: 'balance_amount', operator: 'lte', threshold: 100 }); // no trigger (balance=300)
        const a3 = makeAlert({ metric: 'balance_amount', operator: 'lte', threshold: 500 }); // triggers
        const result = evaluateAlerts([a1, a2, a3], baseInput);
        expect(result).toHaveLength(2);
        expect(result.map((r) => r.alert.id)).toContain(a1.id);
        expect(result.map((r) => r.alert.id)).toContain(a3.id);
    });

    it('returns empty array when no alerts provided', () => {
        expect(evaluateAlerts([], baseInput)).toEqual([]);
    });

    it('handles zero income without crashing for saving_pct', () => {
        const alert = makeAlert({ metric: 'saving_pct', operator: 'gte', threshold: 10 });
        const inputNoIncome = { ...baseInput, totalIncome: 0 };
        expect(evaluateAlerts([alert], inputNoIncome)).toHaveLength(0);
    });

    it('handles zero available without crashing for expenses_pct', () => {
        const alert = makeAlert({ metric: 'expenses_pct', operator: 'gte', threshold: 10 });
        const inputNoAvailable = { ...baseInput, carryover: 0, totalIncome: 0 };
        expect(evaluateAlerts([alert], inputNoAvailable)).toHaveLength(0);
    });
});
