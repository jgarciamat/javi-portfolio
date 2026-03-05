import { render, screen, fireEvent } from '@testing-library/react';
import { AIAdvisor } from '@modules/finances/ui/components/AIAdvisor';
import type { AIAdvice } from '@core/api/premiumApi';
import esJson from '@locales/es.json';

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;

jest.mock('@core/i18n/I18nContext', () => ({
    useI18n: () => ({ locale: 'es', setLocale: jest.fn(), t, tCategory: (n: string) => n }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── Mutable state object that each mock call reads from ─────────────────────
const mockAnalyze = jest.fn();

interface HookState {
    advice: AIAdvice | null;
    loading: boolean;
    error: string | null;
    analyzed: boolean;
    daysUntilNextAnalysis: number;
    hoursUntilNextAnalysis: number;
    justAnalyzed: boolean;
    analyze: jest.Mock;
}

let hookState: HookState = {
    advice: null,
    loading: false,
    error: null,
    analyzed: false,
    daysUntilNextAnalysis: 0,
    hoursUntilNextAnalysis: 0,
    justAnalyzed: false,
    analyze: mockAnalyze,
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
        hookState = { advice: null, loading: false, error: null, analyzed: false, daysUntilNextAnalysis: 0, hoursUntilNextAnalysis: 0, justAnalyzed: false, analyze: mockAnalyze };
    });

    test('renders the panel with title', () => {
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByText(/Asesor financiero IA/i)).toBeInTheDocument();
    });

    test('renders "Analizar mes" button when no advice', () => {
        const { container } = render(<AIAdvisor year={2025} month={1} />);
        const btn = container.querySelector('.ai-btn--primary') as HTMLElement;
        expect(btn).toHaveTextContent(/Analizar mes/i);
    });

    test('clicking "Analizar mes" calls analyze with year and month', () => {
        const { container } = render(<AIAdvisor year={2025} month={3} />);
        const btn = container.querySelector('.ai-btn--primary') as HTMLElement;
        fireEvent.click(btn);
        expect(mockAnalyze).toHaveBeenCalledTimes(1);
        expect(mockAnalyze).toHaveBeenCalledWith(2025, 3);
    });

    test('button is disabled while loading', () => {
        hookState = { ...hookState, loading: true };
        const { container } = render(<AIAdvisor year={2025} month={1} />);
        const btn = container.querySelector('.ai-btn--primary') as HTMLButtonElement;
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

    test('shows "Reanalizar" button when advice is loaded but not on cooldown', () => {
        hookState = { ...hookState, advice: sampleAdvice, analyzed: false, daysUntilNextAnalysis: 0 };
        const { container } = render(<AIAdvisor year={2025} month={1} />);
        const btn = container.querySelector('.ai-btn--primary') as HTMLElement;
        expect(btn).toHaveTextContent(/Reanalizar/i);
    });

    test('does not render "Cerrar" button', () => {
        hookState = { ...hookState, advice: sampleAdvice };
        const { container } = render(<AIAdvisor year={2025} month={1} />);
        expect(container.querySelector('.ai-btn--ghost')).toBeNull();
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

    test('button shows "✅ Analizado" and is disabled when on cooldown', () => {
        hookState = { ...hookState, advice: sampleAdvice, analyzed: true, daysUntilNextAnalysis: 5, hoursUntilNextAnalysis: 3 };
        const { container } = render(<AIAdvisor year={2025} month={1} />);
        const btn = container.querySelector('.ai-btn--primary') as HTMLButtonElement;
        expect(btn).toHaveTextContent(/Analizado/i);
        expect(btn).toBeDisabled();
    });

    test('shows cooldown message with days and hours remaining', () => {
        hookState = { ...hookState, advice: sampleAdvice, analyzed: true, daysUntilNextAnalysis: 5, hoursUntilNextAnalysis: 3 };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByText(/5 días y 3 horas/i)).toBeInTheDocument();
    });

    test('shows only hours when less than 1 day remaining', () => {
        hookState = { ...hookState, advice: sampleAdvice, analyzed: true, daysUntilNextAnalysis: 0, hoursUntilNextAnalysis: 8 };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByText(/8 horas/i)).toBeInTheDocument();
    });

    test('shows singular "día" and no hours when exactly 1 day remaining', () => {
        hookState = { ...hookState, advice: sampleAdvice, analyzed: true, daysUntilNextAnalysis: 1, hoursUntilNextAnalysis: 0 };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByText(/en 1 día/i)).toBeInTheDocument();
    });

    test('does not show cooldown message when not on cooldown', () => {
        hookState = { ...hookState, advice: sampleAdvice, analyzed: false, daysUntilNextAnalysis: 0, hoursUntilNextAnalysis: 0 };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.queryByText(/Podrás repetir/i)).toBeNull();
    });

    test('button shows "✨ Analizar mes" when not analyzed and no advice', () => {
        hookState = { ...hookState, analyzed: false };
        const { container } = render(<AIAdvisor year={2025} month={1} />);
        const btn = container.querySelector('.ai-btn--primary') as HTMLElement;
        expect(btn).toHaveTextContent(/Analizar mes/i);
    });

    test('shows placeholder text when no advice and no error', () => {
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.getByText(/Pulsa.*Analizar mes/i)).toBeInTheDocument();
    });

    test('placeholder is not shown when advice is present', () => {
        hookState = { ...hookState, advice: sampleAdvice };
        render(<AIAdvisor year={2025} month={1} />);
        expect(screen.queryByText(/Pulsa.*Analizar mes/i)).toBeNull();
    });

    test('panel starts closed on page load even when advice exists (re-hydrated)', () => {
        hookState = { ...hookState, advice: sampleAdvice, analyzed: true, daysUntilNextAnalysis: 5, justAnalyzed: false };
        const { container } = render(<AIAdvisor year={2025} month={1} />);
        const header = container.querySelector('.ai-advisor-header') as HTMLElement;
        expect(header).not.toHaveClass('ai-advisor-header--open');
    });

    test('panel opens when a fresh analysis just completed (justAnalyzed: true)', () => {
        hookState = { ...hookState, advice: sampleAdvice, analyzed: true, daysUntilNextAnalysis: 7, justAnalyzed: true };
        const { container } = render(<AIAdvisor year={2025} month={1} />);
        const header = container.querySelector('.ai-advisor-header') as HTMLElement;
        expect(header).toHaveClass('ai-advisor-header--open');
    });
});
