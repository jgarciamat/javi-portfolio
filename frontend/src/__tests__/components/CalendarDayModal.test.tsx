import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CalendarDayModal } from '@modules/finances/ui/components/CalendarDayModal';
import type { Transaction } from '@modules/finances/domain/types';

// ─── i18n mock helpers ────────────────────────────────────────────────────────

type Messages = Record<string, string>;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const esJson: Messages = require('@locales/es.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const enJson: Messages = require('@locales/en.json');

function makeI18nMock(messages: Messages, locale: string) {
    const t = (key: string) => messages[key] ?? key;
    return {
        useI18n: () => ({ locale, t, tCategory: (n: string) => n, setLocale: jest.fn() }),
        I18nProvider: ({ children }: { children: React.ReactNode }) => children,
    };
}

// Default: Spanish
jest.mock('@core/i18n/I18nContext', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const es: Messages = require('@locales/es.json');
    const t = (key: string) => es[key] ?? key;
    return {
        useI18n: () => ({ locale: 'es', t, tCategory: (n: string) => n, setLocale: jest.fn() }),
        I18nProvider: ({ children }: { children: React.ReactNode }) => children,
    };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const txIncome: Transaction = {
    id: '1', description: 'Nómina', amount: 1500, type: 'INCOME',
    category: 'Trabajo', date: '2026-03-06T10:00:00Z', createdAt: '2026-03-06T10:00:00Z', notes: null,
};
const txExpense: Transaction = {
    id: '2', description: 'Supermercado', amount: 80, type: 'EXPENSE',
    category: 'Alimentación', date: '2026-03-06T14:00:00Z', createdAt: '2026-03-06T14:00:00Z', notes: null,
};
const txSaving: Transaction = {
    id: '3', description: 'Depósito', amount: 200, type: 'SAVING',
    category: 'Ahorro', date: '2026-03-06T16:00:00Z', createdAt: '2026-03-06T16:00:00Z', notes: null,
};

const DAY_KEY = '2026-03-06';
const onClose = jest.fn();

// ─── Render helper ────────────────────────────────────────────────────────────

function renderModal(items: Transaction[] = [txIncome, txExpense]) {
    return render(
        <CalendarDayModal dayKey={DAY_KEY} items={items} onClose={onClose} />,
    );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe('CalendarDayModal — structure', () => {
    test('renders the modal overlay', () => {
        renderModal();
        expect(document.querySelector('.cal-modal-overlay')).toBeInTheDocument();
    });

    test('renders all transaction descriptions', () => {
        renderModal([txIncome, txExpense]);
        expect(screen.getByText('Nómina')).toBeInTheDocument();
        expect(screen.getByText('Supermercado')).toBeInTheDocument();
    });

    test('renders transaction category when present', () => {
        renderModal([txIncome]);
        expect(screen.getByText('Trabajo')).toBeInTheDocument();
    });

    test('shows a date label in the header', () => {
        renderModal([txIncome]);
        // The header should contain some form of the date
        const header = document.querySelector('.cal-modal-header');
        expect(header?.textContent).toBeTruthy();
        expect(header?.textContent?.length).toBeGreaterThan(2);
    });
});

describe('CalendarDayModal — summary totals', () => {
    test('shows income total when there are INCOME transactions', () => {
        renderModal([txIncome]);
        const es = esJson as Messages;
        expect(screen.getByText(es['app.transactions.calendar.popup.income'])).toBeInTheDocument();
    });

    test('shows expense total when there are EXPENSE transactions', () => {
        renderModal([txExpense]);
        const es = esJson as Messages;
        expect(screen.getByText(es['app.transactions.calendar.popup.expenses'])).toBeInTheDocument();
    });

    test('shows saving total when there are SAVING transactions', () => {
        renderModal([txSaving]);
        const es = esJson as Messages;
        expect(screen.getByText(es['app.transactions.calendar.popup.saving'])).toBeInTheDocument();
    });

    test('always shows balance row', () => {
        renderModal([txIncome, txExpense]);
        const es = esJson as Messages;
        expect(screen.getByText(es['app.transactions.calendar.popup.balance'])).toBeInTheDocument();
    });

    test('does NOT show income row when there are no income transactions', () => {
        renderModal([txExpense]);
        const es = esJson as Messages;
        expect(screen.queryByText(es['app.transactions.calendar.popup.income'])).not.toBeInTheDocument();
    });
});

describe('CalendarDayModal — close behaviour', () => {
    test('calls onClose when ✕ button is clicked', () => {
        renderModal();
        const es = esJson as Messages;
        const closeBtn = screen.getByLabelText(es['app.transactions.calendar.popup.close']);
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when clicking the overlay', () => {
        renderModal();
        const overlay = document.querySelector('.cal-modal-overlay')!;
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('does NOT call onClose when clicking inside the modal panel', () => {
        renderModal();
        const modal = document.querySelector('.cal-modal')!;
        fireEvent.click(modal);
        expect(onClose).not.toHaveBeenCalled();
    });
});

describe('CalendarDayModal — i18n (English)', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.doMock('@core/i18n/I18nContext', () =>
            makeI18nMock(enJson as Messages, 'en'),
        );
    });

    afterEach(() => {
        jest.resetModules();
    });

    test('renders English labels', () => {
        // Re-require after mock reset
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { CalendarDayModal: Modal } = require('@modules/finances/ui/components/CalendarDayModal');
        render(<Modal dayKey={DAY_KEY} items={[txIncome]} onClose={onClose} />);
        // In English, the popup.income key resolves to "Income"
        const en = enJson as Messages;
        expect(screen.getByText(en['app.transactions.calendar.popup.income'])).toBeInTheDocument();
    });
});

describe('CalendarDayModal — transaction type badges', () => {
    test('renders INCOME badge label', () => {
        renderModal([txIncome]);
        const es = esJson as Messages;
        expect(screen.getByText(es['app.transaction.form.type.income'])).toBeInTheDocument();
    });

    test('renders EXPENSE badge label', () => {
        renderModal([txExpense]);
        const es = esJson as Messages;
        expect(screen.getByText(es['app.transaction.form.type.expense'])).toBeInTheDocument();
    });

    test('renders SAVING badge label', () => {
        renderModal([txSaving]);
        const es = esJson as Messages;
        expect(screen.getByText(es['app.transaction.form.type.saving'])).toBeInTheDocument();
    });
});
