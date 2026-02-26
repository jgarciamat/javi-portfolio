import { render, screen } from '@testing-library/react';
import { ApiProvider, useApi } from '../../core/context/ApiContext';

function Consumer() {
    const api = useApi();
    return (
        <div>
            <div data-testid="has-tx">{String(!!api.transactionApi)}</div>
            <div data-testid="has-cat">{String(!!api.categoryApi)}</div>
            <div data-testid="has-budget">{String(!!api.budgetApi)}</div>
        </div>
    );
}

describe('ApiContext / ApiProvider', () => {
    test('provides all API objects inside ApiProvider', () => {
        render(
            <ApiProvider>
                <Consumer />
            </ApiProvider>
        );
        expect(screen.getByTestId('has-tx').textContent).toBe('true');
        expect(screen.getByTestId('has-cat').textContent).toBe('true');
        expect(screen.getByTestId('has-budget').textContent).toBe('true');
    });

    test('useApi throws when used outside ApiProvider', () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
        function Bare() { useApi(); return null; }
        expect(() => render(<Bare />)).toThrow('useApi must be used inside ApiProvider');
        consoleError.mockRestore();
    });
});
