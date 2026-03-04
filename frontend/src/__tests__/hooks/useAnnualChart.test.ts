import { renderHook, act } from '@testing-library/react';
import { useAnnualChart } from '../../modules/finances/application/hooks/useAnnualChart';

describe('useAnnualChart', () => {
    test('initialises year from prop', () => {
        const { result } = renderHook(() => useAnnualChart(2025));
        expect(result.current.year).toBe(2025);
        expect(result.current.tooltip).toBeNull();
    });

    test('prevYear decrements year when above minimum (2026)', () => {
        const { result } = renderHook(() => useAnnualChart(2027));
        act(() => result.current.prevYear());
        expect(result.current.year).toBe(2026);
    });

    test('prevYear is blocked at 2026 (app minimum year)', () => {
        const { result } = renderHook(() => useAnnualChart(2026));
        act(() => result.current.prevYear());
        expect(result.current.year).toBe(2026);
    });

    test('prevYearDisabled is true at 2026', () => {
        const { result } = renderHook(() => useAnnualChart(2026));
        expect(result.current.prevYearDisabled).toBe(true);
    });

    test('prevYearDisabled is false above 2026', () => {
        const { result } = renderHook(() => useAnnualChart(2027));
        expect(result.current.prevYearDisabled).toBe(false);
    });

    test('nextYear increments year', () => {
        const { result } = renderHook(() => useAnnualChart(2025));
        act(() => result.current.nextYear());
        expect(result.current.year).toBe(2026);
    });

    test('showTooltip sets tooltip state', () => {
        const { result } = renderHook(() => useAnnualChart(2025));
        const fakeEvent = { clientX: 100, clientY: 200 } as React.MouseEvent;
        act(() => result.current.showTooltip(fakeEvent, 'Ingresos: 1.000 €', '#4ade80'));
        expect(result.current.tooltip).toEqual({ text: 'Ingresos: 1.000 €', color: '#4ade80', x: 100, y: 200 });
    });

    test('moveTooltip updates tooltip state', () => {
        const { result } = renderHook(() => useAnnualChart(2025));
        const fakeEvent = { clientX: 300, clientY: 400 } as React.MouseEvent;
        act(() => result.current.moveTooltip(fakeEvent, 'Gastos: 500 €', '#f87171'));
        expect(result.current.tooltip).toEqual({ text: 'Gastos: 500 €', color: '#f87171', x: 300, y: 400 });
    });

    test('hideTooltip clears tooltip', () => {
        const { result } = renderHook(() => useAnnualChart(2025));
        const fakeEvent = { clientX: 100, clientY: 200 } as React.MouseEvent;
        act(() => result.current.showTooltip(fakeEvent, 'text', 'red'));
        act(() => result.current.hideTooltip());
        expect(result.current.tooltip).toBeNull();
    });

    test('leaveBar hides tooltip when related target has no annual-bar class', () => {
        const { result } = renderHook(() => useAnnualChart(2025));
        const fakeEvent = { clientX: 100, clientY: 200 } as React.MouseEvent;
        act(() => result.current.showTooltip(fakeEvent, 'text', 'red'));
        // relatedTarget without annual-bar class → tooltip should hide
        const leaveEvent = {
            relatedTarget: { classList: { contains: () => false } },
        } as unknown as React.MouseEvent;
        act(() => result.current.leaveBar(leaveEvent));
        expect(result.current.tooltip).toBeNull();
    });

    test('leaveBar keeps tooltip when related target has annual-bar class', () => {
        const { result } = renderHook(() => useAnnualChart(2025));
        const fakeEvent = { clientX: 100, clientY: 200 } as React.MouseEvent;
        act(() => result.current.showTooltip(fakeEvent, 'text', 'red'));
        const leaveEvent = {
            relatedTarget: { classList: { contains: (cls: string) => cls === 'annual-bar' } },
        } as unknown as React.MouseEvent;
        act(() => result.current.leaveBar(leaveEvent));
        expect(result.current.tooltip).not.toBeNull();
    });

    test('leaveBar hides tooltip when relatedTarget is null', () => {
        const { result } = renderHook(() => useAnnualChart(2025));
        const fakeEvent = { clientX: 100, clientY: 200 } as React.MouseEvent;
        act(() => result.current.showTooltip(fakeEvent, 'text', 'red'));
        const leaveEvent = { relatedTarget: null } as unknown as React.MouseEvent;
        act(() => result.current.leaveBar(leaveEvent));
        expect(result.current.tooltip).toBeNull();
    });
});
