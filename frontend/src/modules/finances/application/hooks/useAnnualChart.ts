import { useState } from 'react';
import type { TooltipState } from '@modules/finances/ui/types';

export function useAnnualChart(initialYear: number) {
    const [year, setYear] = useState(initialYear);
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    const showTooltip = (e: React.MouseEvent, text: string, color: string) => {
        setTooltip({ text, color, x: e.clientX, y: e.clientY });
    };

    const moveTooltip = (e: React.MouseEvent, text: string, color: string) => {
        setTooltip({ text, color, x: e.clientX, y: e.clientY });
    };

    const hideTooltip = () => setTooltip(null);

    const leaveBar = (e: React.MouseEvent) => {
        const related = e.relatedTarget as HTMLElement | null;
        if (related && related.classList?.contains('annual-bar')) return;
        hideTooltip();
    };

    const prevYear = () => setYear((y) => y - 1);
    const nextYear = () => setYear((y) => y + 1);

    return {
        year,
        tooltip,
        showTooltip,
        moveTooltip,
        hideTooltip,
        leaveBar,
        prevYear,
        nextYear,
    };
}
