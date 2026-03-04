import { render, screen, fireEvent } from '@testing-library/react';
import { AIAdvisor } from '@modules/finances/ui/components/AIAdvisor';
import type { AIAdvice } from '@core/api/premiumApi';

// ── Mutable state object that each mock call reads from ─────────────────────
const mockAnalyze = jest.fn();
const mockClear = jest.fn();

interface HookState {
    advice: AIAdvice | null;
    loading: boolean;
    error: string | null;
    analyze: jest.Mock;
    clear: jest.Mock;
}

let hookState: HookState = {
    advice: null,
    loading: false,
    error: null,
    analyze: mockAnalyze,
    clear: mockClear,
};

jest.mock('@modules/finances/application/hooks/useAIAdvisor', () => ({
    useAIAdvisor: () => hookState,
}));

const sampleAdvice: AIAdvice = {
    summary: 'Resumen del mes de enero',
    positives: ['Buen control de gastos', 'Ahorraste un 10%'],
    warnings: ['Gasto en Restaurantes alto'],
    tips: ['Reduce suscripciones', 'Configura un fondo de emergencia'],
};

describe('AIAdvisor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset to default (no advice, not loading, no error)
        hookState = { advice: null, loading: false, error: null, analyze: mockAnalyze, clear: mockClear };
    });

    test('renders the panel with title', () => {
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByText(/Asesor financiero IA/i)).toBeInTheDocument();
    });

    test('renders "Analizar mes" button when no advice', () => {
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByRole('button', { name: /Analizar mes/i })).toBeInTheDocument();
    });

    test('clicking "Analizar mes" calls analyze with year and month', () => {
        render(<AIAdvisor year={2025} month={3} />);
        fireEvent.click(screen.getByRole('button', { name: /Analizar mes/i }));
        expect(mockAnalyze).toHaveBeenCalledTimes(1);
        expect(mockAnalyze).toHaveBeenCalledWith(2025, 3);
    });

    test('button is disabled while loading', () => {
        hookState = { ...hookState, loading: true };
        render(<AIAdvisor year={2025} month={1} />);
        // While loading the button shows a spinner and no text — query by role
        const btn = screen.getByRole('button', { name: '' });
        expect(btn).toBeDisabled();
    });

    test('shows spinner element while loading', () => {
        hookState = { ...hookState, loading: true };
        const { container } = render(<AIAdvisor year={2025} month={1} />);
        expect(container.querySelector('.ai-spinner')).toBeInTheDocument();
    });

    test('renders error message when error is set', () => {
        hookState = { ...hookState, error: 'Error de conexión' };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByText(/Error de conexión/i)).toBeInTheDocument();
    });

    test('renders advice summary when advice is present', () => {
        hookState = { ...hookState, advice: sampleAdvice };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByText('Resumen del mes de enero')).toBeInTheDocument();
    });

    test('renders positives section', () => {
        hookState = { ...hookState, advice: sampleAdvice };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByText(/Puntos positivos/i)).toBeInTheDocument();
        expect(screen.getByText('Buen control de gastos')).toBeInTheDocument();
        expect(screen.getByText('Ahorraste un 10%')).toBeInTheDocument();
    });

    test('renders warnings section', () => {
        hookState = { ...hookState, advice: sampleAdvice };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByText(/Advertencias/i)).toBeInTheDocument();
        expect(screen.getByText('Gasto en Restaurantes alto')).toBeInTheDocument();
    });

    test('renders tips section', () => {
        hookState = { ...hookState, advice: sampleAdvice };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByText(/Consejos/i)).toBeInTheDocument();
        expect(screen.getByText('Reduce suscripciones')).toBeInTheDocument();
        expect(screen.getByText('Configura un fondo de emergencia')).toBeInTheDocument();
    });

    test('shows "Reanalizar" button when advice is already loaded', () => {
        hookState = { ...hookState, advice: sampleAdvice };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByRole('button', { name: /Reanalizar/i })).toBeInTheDocument();
    });

    test('shows "Cerrar" button when advice is present', () => {
        hookState = { ...hookState, advice: sampleAdvice };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByRole('button', { name: /Cerrar/i })).toBeInTheDocument();
    });

    test('"Cerrar" button calls clear', () => {
        hookState = { ...hookState, advice: sampleAdvice };
        render(<AIAdvisor year={2025} month={1} />);
        fireEvent.click(screen.getByRole('button', { name: /Cerrar/i }));
        expect(mockClear).toHaveBeenCalledTimes(1);
    });

    test('does not render positives section when list is empty', () => {
        hookState = { ...hookState, advice: { ...sampleAdvice, positives: [] } };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.queryByText(/Puntos positivos/i)).toBeNull();
    });

    test('does not render warnings section when list is empty', () => {
        hookState = { ...hookState, advice: { ...sampleAdvice, warnings: [] } };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.queryByText(/Advertencias/i)).toBeNull();
    });

    test('does not render tips section when list is empty', () => {
        hookState = { ...hookState, advice: { ...sampleAdvice, tips: [] } };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.queryByText(/Consejos/i)).toBeNull();
    });
});
